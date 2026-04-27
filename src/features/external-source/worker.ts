/**
 * Phase 6.15 iter123 / iter132: External source pull worker。
 *
 * `pullSource(sourceId, triggerKind)` で:
 *   1. external_imports に "running" row を insert
 *   2. source.config に従い fetch (custom-rest / yamory 両対応)
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
 *   - yamory: token は Authorization: Bearer header に乗せる。エラー文字列に
 *     token を含めない (error message は status のみ転記)
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
      const r = await pullYamory(src)
      fetched = r.fetched
      created = r.created
      updated = r.updated
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

  const body = await fetchJson(cfg.url, {
    method: cfg.method ?? 'GET',
    headers: cfg.headers ?? {},
  })

  // itemsPath で配列を取り出す (省略時は body 自体を array とみなす)
  const arr = cfg.itemsPath ? getByPath(body, cfg.itemsPath) : body
  if (!Array.isArray(arr)) {
    throw new Error(
      `itemsPath="${cfg.itemsPath ?? '(root)'}" が array ではない (got ${typeof arr})`,
    )
  }

  const stats = await upsertItems(src, arr, {
    idPath: cfg.idPath,
    titlePath: cfg.titlePath,
    duePath: cfg.duePath,
  })
  return { fetched: arr.length, ...stats }
}

const YAMORY_DEFAULT_BASE_URL = 'https://api.yamory.io'
const YAMORY_DEFAULT_ENDPOINT = '/v3/{projectId}/vulnerabilities'
const YAMORY_DEFAULT_ITEMS_PATH = 'items'
const YAMORY_DEFAULT_ID_PATH = 'id'
const YAMORY_DEFAULT_TITLE_PATH = 'title'
const YAMORY_DEFAULT_DUE_PATH = 'due_date'

async function pullYamory(src: typeof externalSources.$inferSelect): Promise<PullStats> {
  const cfg = src.config as {
    token: string
    projectIds?: string[]
    baseUrl?: string
    endpointTemplate?: string
    itemsPath?: string
    idPath?: string
    titlePath?: string
    duePath?: string
  }

  if (!cfg.token) throw new Error('yamory: token が未設定')
  const projectIds = cfg.projectIds ?? []
  if (projectIds.length === 0) {
    throw new Error('yamory: projectIds が 1 件以上必要 (config.projectIds)')
  }

  const baseUrl = (cfg.baseUrl ?? YAMORY_DEFAULT_BASE_URL).replace(/\/$/, '')
  const endpointTemplate = cfg.endpointTemplate ?? YAMORY_DEFAULT_ENDPOINT
  const paths = {
    idPath: cfg.idPath ?? YAMORY_DEFAULT_ID_PATH,
    titlePath: cfg.titlePath ?? YAMORY_DEFAULT_TITLE_PATH,
    duePath: cfg.duePath ?? YAMORY_DEFAULT_DUE_PATH,
  }
  const itemsPath = cfg.itemsPath ?? YAMORY_DEFAULT_ITEMS_PATH

  let fetched = 0
  let created = 0
  let updated = 0

  for (const projectId of projectIds) {
    if (!projectId || typeof projectId !== 'string') continue
    // {projectId} は templating だけなので URL encode して injection を防ぐ
    const url = baseUrl + endpointTemplate.replace('{projectId}', encodeURIComponent(projectId))
    let body: unknown
    try {
      body = await fetchJson(url, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${cfg.token}`,
        },
      })
    } catch (e) {
      // yamory: 1 project が落ちても他の project の取込は続けたいが、エラー把握のため
      // 最初の失敗で全体を fail させる (custom-rest と同じ挙動)。token を error msg に
      // 漏らさないよう、status 文字列のみ伝播。
      const msg = e instanceof Error ? e.message : String(e)
      throw new Error(`yamory project ${projectId}: ${msg}`)
    }

    const arr = getByPath(body, itemsPath)
    if (!Array.isArray(arr)) {
      throw new Error(
        `yamory project ${projectId}: itemsPath="${itemsPath}" が array ではない (got ${typeof arr})`,
      )
    }

    fetched += arr.length
    const stats = await upsertItems(src, arr, paths)
    created += stats.created
    updated += stats.updated
  }

  return { fetched, created, updated }
}

/** タイムアウト + サイズ上限付きで JSON を取得する */
async function fetchJson(url: string, init: RequestInit): Promise<unknown> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal })
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} from ${url}`)
    }
    const text = await res.text()
    if (text.length > MAX_BODY_BYTES) {
      throw new Error(`response body ${text.length}B が ${MAX_BODY_BYTES}B 上限を超過`)
    }
    return JSON.parse(text)
  } finally {
    clearTimeout(timer)
  }
}

interface ExtractPaths {
  idPath: string
  titlePath: string
  duePath?: string
}

/** 配列の各要素を items に upsert + external_item_links を作成/更新する。 */
async function upsertItems(
  src: typeof externalSources.$inferSelect,
  arr: unknown[],
  paths: ExtractPaths,
): Promise<{ created: number; updated: number }> {
  let created = 0
  let updated = 0

  for (const raw of arr) {
    if (raw == null || typeof raw !== 'object') continue
    const externalId = String(getByPath(raw, paths.idPath) ?? '').trim()
    const title = String(getByPath(raw, paths.titlePath) ?? '').trim()
    if (!externalId || !title) continue

    const dueStr = paths.duePath ? getByPath(raw, paths.duePath) : null
    const dueDate = isIsoDate(dueStr) ? (dueStr as string).slice(0, 10) : null

    const [existing] = await adminDb
      .select({ id: externalItemLinks.id, itemId: externalItemLinks.itemId })
      .from(externalItemLinks)
      .where(
        and(eq(externalItemLinks.sourceId, src.id), eq(externalItemLinks.externalId, externalId)),
      )
      .limit(1)

    if (existing) {
      await adminDb
        .update(externalItemLinks)
        .set({ lastPayload: raw as never, lastSyncedAt: new Date() })
        .where(eq(externalItemLinks.id, existing.id))
      updated++
    } else {
      const [newItem] = await adminDb
        .insert(items)
        .values({
          workspaceId: src.workspaceId,
          title: title.slice(0, 500),
          status: 'todo',
          dueDate,
          createdByActorType: 'agent',
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

  return { created, updated }
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
