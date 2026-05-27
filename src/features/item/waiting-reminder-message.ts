/**
 * iter1419 (queue 連絡待ち WT-5/6 substrate): 連絡待ちリマインドの通知 / Slack DM 本文を
 * 組み立てる pure helper。
 *
 * 設計目的 (FEEDBACK_QUEUE.md 連絡待ち WT-5 / WT-6 / WT-7):
 *   - waiting-reminder-due.ts は「いま送るべき item」 を抽出する。本 helper はその item の
 *     リマインド **本文** (依頼先 + 経過日数 + item link) を deterministic に整形する。
 *   - in-app notification と Slack DM の両方で同じ文面を再利用 (送信経路は service)。
 *
 * Slack token / DB に触れない pure helper。AI 不使用。Vitest 単体で網羅。
 */
import type { WaitingForState } from './schema'

export interface WaitingReminderContext {
  itemTitle: string
  waitingFor: WaitingForState
  daysElapsed: number
  /** saikyo-todo の item deep link (任意) */
  itemUrl?: string | null
}

export interface WaitingReminderMessage {
  /** 通知タイトル (bell / Slack 見出し) */
  title: string
  /** 本文 (依頼先 + 経過 + link) */
  body: string
}

function truncate(s: string, max: number): string {
  const t = s.trim()
  return t.length > max ? `${t.slice(0, max - 1)}…` : t
}

export function buildWaitingReminderMessage(ctx: WaitingReminderContext): WaitingReminderMessage {
  const title = `連絡待ちリマインド: ${truncate(ctx.itemTitle, 60)}`

  const target = (ctx.waitingFor.targetLabel ?? '').trim() || '相手'
  const elapsed = ctx.daysElapsed <= 0 ? '本日依頼' : `依頼から ${ctx.daysElapsed} 日経過`

  let body = `「${ctx.itemTitle.trim()}」 は ${target} からの返答待ちです (${elapsed})。`
  const url = (ctx.itemUrl ?? '').trim()
  if (url) body += `\n${url}`

  return { title, body }
}
