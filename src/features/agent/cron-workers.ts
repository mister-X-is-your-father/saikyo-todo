/**
 * 定期実行 worker: PM Stand-up / Template 再展開。
 *
 * - `pm-standup-tick`: pg-boss schedule で毎日 09:00 UTC に発火。
 *     全 workspace に対して pm-standup ジョブを fan-out。
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
import { enqueueJob, type PmStandupJobData } from '@/lib/jobs/queue'

import { pmService } from '@/features/agent/pm-service'
import { templateService } from '@/features/template/service'

function dateKeyUTC(now: Date): string {
  return now.toISOString().slice(0, 10)
}

/**
 * Daily 09:00 UTC tick.
 * 全 workspace に pm-standup ジョブを fan-out (per workspace 1 件)。
 * idempotency は pm-standup handler 側で agent_invocations.idempotency_key で担保。
 */
export async function handlePmStandupTick(): Promise<void> {
  const dateKey = dateKeyUTC(new Date())
  const rows = await adminDb.execute<{ id: string }>(
    sql`select id from public.workspaces where deleted_at is null`,
  )
  const workspaceIds = (rows as unknown as Array<{ id: string }>).map((r) => r.id)
  console.log(`[pm-standup-tick] fan-out to ${workspaceIds.length} workspaces for ${dateKey}`)
  for (const workspaceId of workspaceIds) {
    try {
      await enqueueJob('pm-standup', { workspaceId, dateKey })
    } catch (e) {
      console.error(`[pm-standup-tick] enqueue failed workspace=${workspaceId}`, e)
    }
  }
}

/**
 * 1 workspace の PM Stand-up を実行。
 * idempotency_key = UUIDv5-相当の安定キー (namespace = 'standup', name = ws + dateKey)
 * を本来は使いたいが、MVP では UUID を使いつつ agent_invocations UNIQUE で防ぐ。
 * ここでは dateKey × workspaceId で手動重複検知を行う (既に completed invocation があれば skip)。
 */
export async function handlePmStandup(
  jobs: Array<{ id: string; data: PmStandupJobData }>,
): Promise<void> {
  for (const job of jobs) {
    const { workspaceId, dateKey } = job.data
    try {
      // その日既に stand-up が走った agent_invocation があるかチェック
      const existing = await adminDb.execute<{ id: string }>(
        sql`
          select i.id from public.agent_invocations i
          join public.agents a on a.id = i.agent_id
          where a.workspace_id = ${workspaceId}::uuid
            and a.role = 'pm'
            and i.status = 'completed'
            and (i.input->>'role') = 'pm'
            and to_char(i.created_at at time zone 'UTC', 'YYYY-MM-DD') = ${dateKey}
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
