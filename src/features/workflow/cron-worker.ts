/**
 * Phase 6.15 iter155: Workflow auto-trigger cron worker。
 *
 * pg-boss `workflow-cron-tick` queue が `* * * * *` (毎分) で発火する。
 * 各 tick で:
 *   1. enabled + 削除されてない workflow から trigger.kind='cron' のものを取得
 *   2. cron-parser で「直近 1 分間に発火対象だったか」を評価
 *      (tick が 1 分単位なので prev fire が tick 開始の 60s 以内なら一致)
 *   3. 該当する workflow を `runWorkflow(..., triggerKind: 'cron')` で起動
 *      (重複抑止: 同 workflow + minute bucket で fire-and-forget は per-tick 一回)
 *
 * 注意:
 *   - cron 表現は workspace timezone 解釈ではなく **server local TZ** で評価される
 *     (template-cron-tick と揃える、TZ 切替は post-MVP)。
 *   - 起動失敗は workflow_runs に status='failed' で記録される (engine.ts 経路)。
 */
import 'server-only'

import { CronExpressionParser } from 'cron-parser'
import { and, eq, isNull } from 'drizzle-orm'

import { workflows } from '@/lib/db/schema'
import { adminDb } from '@/lib/db/scoped-client'

import { runWorkflow } from './engine'
import type { Workflow } from './schema'

interface CronTrigger {
  kind: 'cron'
  cron: string
}

function isCronTrigger(trigger: unknown): trigger is CronTrigger {
  if (!trigger || typeof trigger !== 'object') return false
  const t = trigger as Record<string, unknown>
  return t.kind === 'cron' && typeof t.cron === 'string' && t.cron.length > 0
}

/**
 * 直近 1 分以内 (now-60s 〜 now) に cron が「発火対象」になっていたか。
 * cron-parser は次/前の発火時刻を返すので、prev() を取って今との差分を見る。
 *
 * 例: cron='0 9 * * *' で now=09:00:30 → prev=09:00:00 → diff=30s → fire対象
 *     cron='0 9 * * *' で now=10:00:00 → prev=09:00:00 → diff=3600s → fire 対象外
 */
export function shouldFireInLastMinute(cronExpr: string, now: Date): boolean {
  // 空 / 5 フィールド未満を弾く (cron-parser は緩い処理をするため事前ガード)
  if (typeof cronExpr !== 'string') return false
  const trimmed = cronExpr.trim()
  if (!trimmed) return false
  if (trimmed.split(/\s+/).length < 5) return false
  try {
    // cron-parser の prev() は currentDate **未満** の最後の fire 時刻を返す。
    // 「sec=0 ちょうど」を捕捉するため currentDate に +100ms オフセットを入れる
    // (worker が秒単位の jitter を持つので実害なく、確実に「今ちょうど fire」を拾える)。
    const probe = new Date(now.getTime() + 100)
    const it = CronExpressionParser.parse(trimmed, { currentDate: probe })
    const prev = it.prev().toDate()
    const diffMs = now.getTime() - prev.getTime()
    return diffMs >= 0 && diffMs < 60_000
  } catch {
    // 不正な cron は無視 (workflow editor 側で zod がいずれ型を絞るが、現状は free string)
    return false
  }
}

export async function handleWorkflowCronTick(): Promise<void> {
  const now = new Date()
  const rows = await adminDb
    .select()
    .from(workflows)
    .where(and(eq(workflows.enabled, true), isNull(workflows.deletedAt)))
  const cronWfs = rows.filter((w: Workflow) => isCronTrigger(w.trigger))
  console.log(
    `[workflow-cron-tick] evaluating ${cronWfs.length} cron workflows at ${now.toISOString()}`,
  )
  for (const wf of cronWfs) {
    const trigger = wf.trigger as CronTrigger
    if (!shouldFireInLastMinute(trigger.cron, now)) continue
    try {
      const r = await runWorkflow({
        workflowId: wf.id,
        triggerKind: 'cron',
        input: { cron: trigger.cron, firedAt: now.toISOString() },
      })
      console.log(`[workflow-cron-tick] fired wf=${wf.id} cron=${trigger.cron} status=${r.status}`)
    } catch (e) {
      console.error(`[workflow-cron-tick] unexpected wf=${wf.id} cron=${trigger.cron}`, e)
    }
  }
}
