/**
 * iter1409 (queue AC-4 substrate): AI 分業/協業「hand-off 履歴 view」の pure helper。
 *
 * 設計目的 (FEEDBACK_QUEUE.md AI 分業/協業 シリーズ AC-4):
 *   - 「最近 AI が触った task」 の 人 ↔ AI ターン履歴 (誰が何をしたか) を 1 panel で可視化。
 *   - audit_log / comment events (actorType + action + timestamp) を入力に、連続する
 *     同 actor の操作を 1 「ターン」 に畳んで時系列に並べ、受け渡し回数 / 最後の手番を集計。
 *   - 「いま AI 待ちか人間待ちか」 「何回バトンが渡ったか」 が即わかる → 漏れ防止。
 *
 * AC-1 handoff-phase.ts (1 item の phase state machine) とは別軸:
 *   本 helper は **複数 event の時系列** を畳んで turn 列にする (履歴 view 用)。
 *
 * AI 不使用、副作用無し。pure helper + Vitest 単体で網羅。
 */
import { parseDateOrNull } from '@/lib/date/iso'

export type HandoffActorType = 'human' | 'ai'

export interface HandoffEvent {
  actorType: HandoffActorType
  /** 表示名 (省略時は actorType の default ラベル) */
  actorLabel?: string | null
  /** 操作 (例: 'plan_generated' / 'commented' / 'status_changed') */
  action: string
  /** 発生時刻 (Date or ISO)、parse 不能 event は除外 */
  at: Date | string
}

export interface HandoffTurn {
  actorType: HandoffActorType
  actorLabel: string
  /** このターンの操作 (時刻昇順) */
  actions: string[]
  startedAt: string
  endedAt: string
}

export interface HandoffTimelineSummary {
  totalEvents: number
  turnCount: number
  /** actor が切り替わった回数 (= バトン受け渡し、turnCount-1) */
  handoffCount: number
  aiEventCount: number
  humanEventCount: number
  /** 直近 event の actor (= 今の手番)、event 無しは null */
  lastActorType: HandoffActorType | null
}

export interface HandoffTimeline {
  turns: HandoffTurn[]
  summary: HandoffTimelineSummary
}

const DEFAULT_LABEL: Record<HandoffActorType, string> = { human: '担当者', ai: 'AI' }

export function buildHandoffTimeline(events: readonly HandoffEvent[]): HandoffTimeline {
  // parse 可能な event のみ + 時刻昇順 (安定: 同時刻は入力順)
  const parsed = events
    .map((e, i) => ({ e, i, date: parseDateOrNull(e.at) }))
    .filter((x): x is { e: HandoffEvent; i: number; date: Date } => x.date !== null)
    .sort((a, b) => a.date.getTime() - b.date.getTime() || a.i - b.i)

  const turns: HandoffTurn[] = []
  let aiEventCount = 0
  let humanEventCount = 0

  for (const { e, date } of parsed) {
    if (e.actorType === 'ai') aiEventCount += 1
    else humanEventCount += 1

    const iso = date.toISOString()
    const last = turns[turns.length - 1]
    if (last && last.actorType === e.actorType) {
      last.actions.push(e.action)
      last.endedAt = iso
    } else {
      turns.push({
        actorType: e.actorType,
        actorLabel: (e.actorLabel ?? '').trim() || DEFAULT_LABEL[e.actorType],
        actions: [e.action],
        startedAt: iso,
        endedAt: iso,
      })
    }
  }

  const lastTurn = turns[turns.length - 1]
  return {
    turns,
    summary: {
      totalEvents: parsed.length,
      turnCount: turns.length,
      handoffCount: Math.max(0, turns.length - 1),
      aiEventCount,
      humanEventCount,
      lastActorType: lastTurn ? lastTurn.actorType : null,
    },
  }
}

/**
 * chip / Slack / AI prompt 用 1 行 summary。
 *   'AI 3 / 人 2 操作・受け渡し 3 回・今の手番: AI'
 *   '操作なし'                                       (event 0)
 */
export function formatHandoffTimelineSummaryJa(summary: HandoffTimelineSummary): string {
  if (summary.totalEvents === 0) return '操作なし'
  const turnLabel = summary.lastActorType === null ? '—' : DEFAULT_LABEL[summary.lastActorType]
  return (
    `AI ${summary.aiEventCount} / 人 ${summary.humanEventCount} 操作・` +
    `受け渡し ${summary.handoffCount} 回・今の手番: ${turnLabel}`
  )
}
