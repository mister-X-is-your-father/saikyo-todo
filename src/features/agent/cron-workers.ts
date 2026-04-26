/**
 * 定期実行 worker: PM Stand-up / Template 再展開。
 *
 * - `pm-standup-tick`: pg-boss schedule で 15 分おきに発火 (TZ-aware fan-out)。
 *     各 workspace の `workspace_settings.timezone` でローカライズした
 *     `standup_cron` (既定 `0 9 * * *`) を評価し、前回処理以降に発火していれば
 *     その workspace に pm-standup ジョブを enqueue する。
 *     → JST workspace は 18:00 UTC (= 09:00 JST) 前後の tick で発火、
 *        America/New_York なら 13:00/14:00 UTC (DST 依存) で発火する。
 * - `pm-standup`: 1 workspace の stand-up を実行。
 * - `template-cron-tick`: 15 分おき。recurring Template を全部 instantiate 試行。
 *     `cron_run_id` UNIQUE 制約で重複実行は DB レベルで防止される。
 *
 * エラーは throw せずログに留める (pg-boss 再試行での二重実行を避ける)。
 */
import 'server-only'

import { sql } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'

import { adminDb } from '@/lib/db/scoped-client'
import { enqueueJob, type PmRecoveryJobData, type PmStandupJobData } from '@/lib/jobs/queue'

import { shouldFireForWorkspace } from '@/features/agent/cron-tz'
import { pmService } from '@/features/agent/pm-service'
import { templateService } from '@/features/template/service'

function dateKeyUTC(now: Date): string {
  return now.toISOString().slice(0, 10)
}

/** Default cron used when a workspace has no settings row (defensive). */
const DEFAULT_STANDUP_CRON = '0 9 * * *'
const DEFAULT_TIMEZONE = 'Asia/Tokyo'

/**
 * 15 分おきの tick (TZ-aware fan-out).
 *
 * 各 workspace について
 *   - `workspace_settings.timezone` (既定 Asia/Tokyo)
 *   - `workspace_settings.standup_cron` (既定 `0 9 * * *`)
 *   - その workspace で最後に completed した PM stand-up invocation の `created_at`
 * を組み合わせて `shouldFireForWorkspace` を評価し、true のときだけ enqueue する。
 *
 * idempotency は pm-standup handler 側で agent_invocations の dateKey 重複検知で
 * 二重に守られている。`dateKey` は workspace tz でのローカル日付を採用する
 * (= JST workspace なら JST 基準の YYYY-MM-DD)。
 *
 * 内部で例外が起きても他 workspace の処理を止めない。
 */
export async function handlePmStandupTick(options: { now?: Date } = {}): Promise<void> {
  const now = options.now ?? new Date()
  type WsRow = {
    id: string
    timezone: string | null
    standup_cron: string | null
    last_fired_at: string | null
  }
  // 1 クエリで workspace + settings + 直近 stand-up invocation を引く。
  // last_fired_at は role='pm' かつ status='completed' で input.role='pm' のもの最大。
  const rows = await adminDb.execute<WsRow>(
    sql`
      select
        w.id,
        s.timezone,
        s.standup_cron,
        (
          select max(i.created_at)::text
          from public.agent_invocations i
          join public.agents a on a.id = i.agent_id
          where a.workspace_id = w.id
            and a.role = 'pm'
            and i.status = 'completed'
            and (i.input->>'role') = 'pm'
        ) as last_fired_at
      from public.workspaces w
      left join public.workspace_settings s on s.workspace_id = w.id
      where w.deleted_at is null
    `,
  )
  const workspaces = rows as unknown as Array<WsRow>
  let fired = 0
  for (const ws of workspaces) {
    try {
      const tz = ws.timezone ?? DEFAULT_TIMEZONE
      const cronExpr = ws.standup_cron ?? DEFAULT_STANDUP_CRON
      const lastFiredAt = ws.last_fired_at ? new Date(ws.last_fired_at) : null
      const should = shouldFireForWorkspace({ cronExpr, tz, now, lastFiredAt })
      if (!should) continue

      // dateKey は workspace tz のローカル日付。idempotency 強化と log 用。
      const dateKey = formatLocalDateKey(now, tz)
      await enqueueJob('pm-standup', { workspaceId: ws.id, dateKey })
      fired++
    } catch (e) {
      console.error(`[pm-standup-tick] enqueue failed workspace=${ws.id}`, e)
    }
  }
  console.log(
    `[pm-standup-tick] evaluated ${workspaces.length} ws, fired=${fired} at ${now.toISOString()}`,
  )
}

/**
 * Format a UTC `Date` as `YYYY-MM-DD` in the given IANA timezone.
 * Avoids pulling Luxon into the worker — `Intl.DateTimeFormat` is enough.
 */
function formatLocalDateKey(now: Date, tz: string): string {
  try {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    // 'en-CA' yields YYYY-MM-DD natively.
    return fmt.format(now)
  } catch {
    return dateKeyUTC(now)
  }
}

/**
 * 1 workspace の PM Stand-up を実行。
 * idempotency_key = UUIDv5-相当の安定キー (namespace = 'standup', name = ws + dateKey)
 * を本来は使いたいが、MVP では UUID を使いつつ agent_invocations UNIQUE で防ぐ。
 * ここでは dateKey × workspaceId で手動重複検知を行う (既に completed invocation があれば skip)。
 *
 * dateKey は tick handler が workspace tz で計算した YYYY-MM-DD を渡してくる。
 * 重複チェックも同じ tz で日付を切り出す (workspace_settings.timezone 取得)。
 */
export async function handlePmStandup(
  jobs: Array<{ id: string; data: PmStandupJobData }>,
): Promise<void> {
  for (const job of jobs) {
    const { workspaceId, dateKey } = job.data
    try {
      // workspace tz を取得 (無ければ既定 Asia/Tokyo)。
      const tzRow = await adminDb.execute<{ timezone: string | null }>(
        sql`select timezone from public.workspace_settings where workspace_id = ${workspaceId}::uuid limit 1`,
      )
      const tz =
        (tzRow as unknown as Array<{ timezone: string | null }>)[0]?.timezone ?? DEFAULT_TIMEZONE

      // その日既に stand-up が走った agent_invocation があるかチェック (workspace tz 基準)
      const existing = await adminDb.execute<{ id: string }>(
        sql`
          select i.id from public.agent_invocations i
          join public.agents a on a.id = i.agent_id
          where a.workspace_id = ${workspaceId}::uuid
            and a.role = 'pm'
            and i.status = 'completed'
            and (i.input->>'role') = 'pm'
            and to_char(i.created_at at time zone ${tz}, 'YYYY-MM-DD') = ${dateKey}
          limit 1
        `,
      )
      const rows = existing as unknown as Array<{ id: string }>
      if (rows.length > 0) {
        console.log(`[pm-standup] skip (already done) workspace=${workspaceId} date=${dateKey}`)
        continue
      }
      const r = await pmService.runStandup({
        workspaceId,
        idempotencyKey: randomUUID(),
      })
      if (!r.ok) {
        console.error(
          `[pm-standup] failed workspace=${workspaceId} date=${dateKey}: ${r.error.code} ${r.error.message}`,
        )
      } else {
        console.log(
          `[pm-standup] completed workspace=${workspaceId} date=${dateKey} cost=${r.value.costUsd}`,
        )
      }
    } catch (e) {
      console.error(`[pm-standup] unexpected workspace=${workspaceId}`, e)
    }
  }
}

/**
 * MUST Recovery worker. heartbeat service から stage=1d|overdue の MUST item が
 * enqueue される。pm-service.runRecovery で Recovery Plan Doc + 注意喚起コメントを
 * 投下する。singletonKey (ws+item+stage+date) で 1 日 1 回に抑制済み。
 */
export async function handlePmRecovery(
  jobs: Array<{ id: string; data: PmRecoveryJobData }>,
): Promise<void> {
  const { pmService } = await import('@/features/agent/pm-service')
  for (const job of jobs) {
    const { workspaceId, itemId, stage } = job.data
    try {
      const r = await pmService.runRecovery({
        workspaceId,
        itemId,
        stage,
        idempotencyKey: randomUUID(),
      })
      if (!r.ok) {
        console.error(
          `[pm-recovery] failed workspace=${workspaceId} item=${itemId} stage=${stage}: ${r.error.code} ${r.error.message}`,
        )
      } else {
        console.log(
          `[pm-recovery] completed workspace=${workspaceId} item=${itemId} stage=${stage} cost=${r.value.costUsd}`,
        )
      }
    } catch (e) {
      console.error(
        `[pm-recovery] unexpected workspace=${workspaceId} item=${itemId} stage=${stage}`,
        e,
      )
    }
  }
}

/**
 * 15 分おきの tick。recurring Template を全部拾って instantiate を試行。
 * cron_run_id は `<template-id>:<yyyy-mm-dd-hh>` で、同日同時間帯の多重実行を防ぐ。
 *
 * 注: 真の cron 表現 (9 * * *) を厳密に解釈していないので、実際は「毎時 1 回展開」される。
 * MVP 規模では十分。cron-parser 導入は post-MVP (POST_MVP.md 検討)。
 */
export async function handleTemplateCronTick(): Promise<void> {
  const now = new Date()
  const hourKey = `${now.toISOString().slice(0, 13)}` // yyyy-mm-ddTHH
  const rows = await adminDb.execute<{ id: string; workspace_id: string; created_by: string }>(
    sql`
      select id, workspace_id, created_by
      from public.templates
      where kind = 'recurring'
        and deleted_at is null
    `,
  )
  const templates = rows as unknown as Array<{
    id: string
    workspace_id: string
    created_by: string
  }>
  console.log(`[template-cron-tick] evaluating ${templates.length} recurring templates`)
  for (const t of templates) {
    // templateService.instantiate は requireUser を使うので、cron 経由では
    // instantiateForAgent (agent actor) は不適切だが、MVP では agentId として
    // template.createdBy (user) を借用して記録する。本来は dedicated system agent が望ましいが
    // post-MVP で対応。
    try {
      const cronRunId = `cron:${t.id}:${hourKey}`
      // system 相当の agent を借りる: ensureAgent('pm') を workspace ごとに呼び出す
      const { agentService } = await import('@/features/agent/service')
      const agent = await agentService.ensureAgent(t.workspace_id, 'pm')
      const r = await templateService.instantiateForAgent({
        templateId: t.id,
        workspaceId: t.workspace_id,
        agentId: agent.id,
        variables: {},
        cronRunId,
      })
      if (!r.ok) {
        // CONFLICT は冪等重複なので INFO レベル
        const level = r.error.code === 'CONFLICT' ? 'log' : 'error'
        const msg = `[template-cron-tick] template=${t.id} cron=${cronRunId} ${r.error.code} ${r.error.message}`
        if (level === 'log') console.log(msg)
        else console.error(msg)
      } else {
        console.log(
          `[template-cron-tick] template=${t.id} instantiated items=${r.value.createdItemCount}`,
        )
      }
    } catch (e) {
      console.error(`[template-cron-tick] unexpected template=${t.id}`, e)
    }
  }
}
