/**
 * Phase 6.15 iter123: External source pull worker。
 *
 * `pullSource(sourceId, triggerKind)` で:
 *   1. external_imports に "running" row を insert
 *   2. source.config に従い fetch (custom-rest のみ実装、yamory は次 iter)
 *   3. itemsPath で配列取出 → 各要素を idPath / titlePath / duePath で抽出
 *   4. external_item_links を (sourceId, externalId) で lookup
 *      - 既存: lastPayload + lastSyncedAt のみ update (updatedCount++)
 *      - 新規: items に insert + links に row 追加 (createdCount++)
 *   5. external_imports を status=succeeded で update + 合計件数を保存
 *
 * セキュリティ:
 *   - URL は zod url() で検証済 (schema 側)
 *   - timeout 30s — workflow worker と同じ AbortController パターン
 *   - response body は 5MB cap (XL の API 防御)
 *   - workspace 横断 admin 操作なので adminDb を使う (cron / manual trigger 双方から呼ぶ)
 */
import 'server-only'

import { and, eq } from 'drizzle-orm'

import { externalImports, externalItemLinks, externalSources, items } from '@/lib/db/schema'
import { adminDb } from '@/lib/db/scoped-client'

const FETCH_TIMEOUT_MS = 30_000
const MAX_BODY_BYTES = 5 * 1024 * 1024

export interface PullResult {
  importId: string
  status: 'succeeded' | 'failed'
  fetched: number
  created: number
  updated: number
  error?: string
}

export async function pullSource(
  sourceId: string,
  triggerKind: 'manual' | 'cron',
): Promise<PullResult> {
  // 1. source 取得
  const [src] = await adminDb
    .select()
    .from(externalSources)
    .where(eq(externalSources.id, sourceId))
    .limit(1)
  if (!src) throw new Error(`source ${sourceId} が見つかりません`)
  if (src.deletedAt) throw new Error(`source ${sourceId} は削除済`)
  if (!src.enabled) throw new Error(`source ${sourceId} は disabled`)

  // 2. import row 作成
  const [importRow] = await adminDb
    .insert(externalImports)
    .values({
      workspaceId: src.workspaceId,
      sourceId: src.id,
      status: 'running',
      triggerKind,
      startedAt: new Date(),
    })
    .returning()
  if (!importRow) throw new Error('external_imports insert failed')
  const importId = importRow.id

  let fetched = 0
  let created = 0
  let updated = 0

  try {
    if (src.kind === 'custom-rest') {
      const r = await pullCustomRest(src)
      fetched = r.fetched
      created = r.created
      updated = r.updated
    } else if (src.kind === 'yamory') {
      // 次 iter で実装。とりあえず明示的に NotImplemented で fail。
      throw new Error('yamory pull は未実装 (次 iter)')
    } else {
      throw new Error(`未知の source.kind: ${src.kind}`)
    }

    await adminDb
      .update(externalImports)
      .set({
        status: 'succeeded',
        fetchedCount: fetched,
        createdCount: created,
        updatedCount: updated,
        finishedAt: new Date(),
      })
      .where(eq(externalImports.id, importId))
    return { importId, status: 'succeeded', fetched, created, updated }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await adminDb
      .update(externalImports)
      .set({
        status: 'failed',
        fetchedCount: fetched,
        createdCount: created,
        updatedCount: updated,
        error: msg,
        finishedAt: new Date(),
      })
      .where(eq(externalImports.id, importId))
    return { importId, status: 'failed', fetched, created, updated, error: msg }
  }
}

interface PullStats {
  fetched: number
  created: number
  updated: number
}

async function pullCustomRest(src: typeof externalSources.$inferSelect): Promise<PullStats> {
  const cfg = src.config as {
    url: string
    method?: 'GET' | 'POST'
    headers?: Record<string, string>
    itemsPath?: string
    idPath: string
    titlePath: string
    duePath?: string
  }

  // fetch with timeout
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
  let body: unknown
  try {
    const res = await fetch(cfg.url, {
      method: cfg.method ?? 'GET',
      headers: cfg.headers ?? {},
      signal: ctrl.signal,
    })
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} from ${cfg.url}`)
    }
    const text = await res.text()
    if (text.length > MAX_BODY_BYTES) {
      throw new Error(`response body ${text.length}B が ${MAX_BODY_BYTES}B 上限を超過`)
    }
    body = JSON.parse(text)
  } finally {
    clearTimeout(timer)
  }

  // itemsPath で配列を取り出す (省略時は body 自体を array とみなす)
  const arr = cfg.itemsPath ? getByPath(body, cfg.itemsPath) : body
  if (!Array.isArray(arr)) {
    throw new Error(
      `itemsPath="${cfg.itemsPath ?? '(root)'}" が array ではない (got ${typeof arr})`,
    )
  }

  let created = 0
  let updated = 0

  // 各要素を upsert
  for (const raw of arr) {
    if (raw == null || typeof raw !== 'object') continue
    const externalId = String(getByPath(raw, cfg.idPath) ?? '').trim()
    const title = String(getByPath(raw, cfg.titlePath) ?? '').trim()
    if (!externalId || !title) continue

    const dueStr = cfg.duePath ? getByPath(raw, cfg.duePath) : null
    const dueDate = isIsoDate(dueStr) ? (dueStr as string).slice(0, 10) : null

    // 既存 link を検索
    const [existing] = await adminDb
      .select({ id: externalItemLinks.id, itemId: externalItemLinks.itemId })
      .from(externalItemLinks)
      .where(
        and(eq(externalItemLinks.sourceId, src.id), eq(externalItemLinks.externalId, externalId)),
      )
      .limit(1)

    if (existing) {
      // update lastPayload + lastSyncedAt のみ (item 本体の更新は次 iter で field map 化する)
      await adminDb
        .update(externalItemLinks)
        .set({ lastPayload: raw as never, lastSyncedAt: new Date() })
        .where(eq(externalItemLinks.id, existing.id))
      updated++
    } else {
      // 新規 item 作成
      const [newItem] = await adminDb
        .insert(items)
        .values({
          workspaceId: src.workspaceId,
          title: title.slice(0, 500),
          status: 'todo',
          dueDate,
          createdByActorType: 'agent', // pull = agent (system) 起源
          createdByActorId: src.createdByActorId,
        })
        .returning({ id: items.id })
      if (!newItem) continue

      await adminDb.insert(externalItemLinks).values({
        workspaceId: src.workspaceId,
        sourceId: src.id,
        itemId: newItem.id,
        externalId,
        lastPayload: raw as never,
      })
      created++
    }
  }

  return { fetched: arr.length, created, updated }
}

/** dot-separated path lookup (例: "data.items" / "user.id") */
function getByPath(obj: unknown, path: string): unknown {
  if (!path || obj == null) return obj
  let cur: unknown = obj
  for (const part of path.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[part]
  }
  return cur
}

function isIsoDate(v: unknown): v is string {
  if (typeof v !== 'string') return false
  return /^\d{4}-\d{2}-\d{2}/.test(v)
}
