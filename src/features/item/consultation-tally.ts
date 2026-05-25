/**
 * iter (queue 相談特化 substrate): フォーマット化された相談 task の投票集計 + 状態判定 pure 関数。
 *
 * ユーザ要望: 「相談のフォーマット化とかでサクッと相談したり、相談にも特化した機能」
 *
 * 設計判断 (FEEDBACK_QUEUE.md 相談 entry):
 *   - 相談 = items.customFields.consultation jsonb で表現 (専用列追加せず柔軟性確保)
 *   - 投票は `consultation_votes (item_id, option_index, user_id, voted_at)` 中間 table
 *   - 本 helper は **vote rows → tally summary** の純集計のみ (DB アクセスなし)
 */

import { MS_PER_DAY } from '@/lib/date/iso'
import type { ChipTone } from '@/lib/ui/chip-tone'
import type { Severity } from '@/lib/widget/severity'

import type { AgentBriefSignal } from '@/features/agent/brief-signal'

export interface ConsultationOption {
  /** option 配列の index (0-based、表示順) */
  index: number
  /** option 1 行 label */
  label: string
}

export interface ConsultationVote {
  optionIndex: number
  userId: string
  votedAt: Date
}

export interface ConsultationTallyRow {
  index: number
  label: string
  voteCount: number
  voters: string[] // userId list (UI で avatar 表示用)
  /** 全 vote に対する比率 0..1 */
  ratio: number
  /** 最多 vote tie 込み */
  isLeading: boolean
}

export interface ConsultationTallySummary {
  rows: ConsultationTallyRow[]
  totalVotes: number
  /** どの option も多数ではない (= 全部 0 票) なら null */
  topIndex: number | null
  /** 投票した unique user 数 (重複投票は最新で 1 票とカウント) */
  uniqueVoters: number
}

/**
 * 投票集計: 各 user は 1 票 (重複時は最新 vote を採用)。
 */
export function tallyConsultation(
  options: readonly ConsultationOption[],
  votes: readonly ConsultationVote[],
): ConsultationTallySummary {
  // 各 user の最新 vote だけ拾う (= 投票を変更可能と仮定)
  const latestByUser = new Map<string, ConsultationVote>()
  for (const v of votes) {
    const prev = latestByUser.get(v.userId)
    if (!prev || v.votedAt > prev.votedAt) latestByUser.set(v.userId, v)
  }

  const counts = new Map<number, string[]>()
  for (const v of latestByUser.values()) {
    if (!counts.has(v.optionIndex)) counts.set(v.optionIndex, [])
    counts.get(v.optionIndex)!.push(v.userId)
  }

  const totalVotes = latestByUser.size
  const maxCount = options.reduce((max, o) => {
    const c = counts.get(o.index)?.length ?? 0
    return c > max ? c : max
  }, 0)

  const rows: ConsultationTallyRow[] = options.map((o) => {
    const voters = counts.get(o.index) ?? []
    const voteCount = voters.length
    return {
      index: o.index,
      label: o.label,
      voteCount,
      voters,
      ratio: totalVotes === 0 ? 0 : voteCount / totalVotes,
      isLeading: voteCount > 0 && voteCount === maxCount,
    }
  })

  // top option (max count); tie の時は最初の index
  const top = rows.find((r) => r.isLeading)
  return {
    rows,
    totalVotes,
    topIndex: top ? top.index : null,
    uniqueVoters: latestByUser.size,
  }
}

/**
 * iter1336 basics: 最多得票で並んでいる option index を **全部** 返す (index 昇順)。
 *
 * `topIndex` は tie 時に最初の 1 つだけ返すため、UI が「案A が最多」と誤認する余地がある。
 * 本 helper は同数 1 位を漏れなく返すので caller は:
 *   - `length === 0` → まだ投票なし
 *   - `length === 1` → 明確な単独 1 位 (= topIndex と一致)
 *   - `length >= 2` → 拮抗 (= 勝者未確定、決定に注意喚起)
 * を判定できる。`isLeading` (voteCount>0 && ===maxCount) を素直に拾うだけの薄い helper。
 */
export function consultationLeadingIndices(summary: ConsultationTallySummary): number[] {
  return summary.rows.filter((r) => r.isLeading).map((r) => r.index)
}

/**
 * iter1336 basics: 最多得票が 2 案以上で並んでいる (= 拮抗、勝者未確定) か。
 *
 * 投票 0 / 単独 1 位 は false。consultation view で「拮抗中」 chip を出して
 * requester に決定を促す判定に使う (= 漏れ防止: 同数で決まらず放置される相談を可視化)。
 */
export function isConsultationContested(summary: ConsultationTallySummary): boolean {
  return consultationLeadingIndices(summary).length >= 2
}

/**
 * 相談 status 判定:
 *   - 'open': 締切未到来 + decided 未済
 *   - 'closing-soon': 締切 ≤ 24h
 *   - 'overdue': 締切 経過 + decided 未済 (= 判断漏れ警告)
 *   - 'decided': requester が「これに決めた」 button 押下済
 */
export type ConsultationStatus = 'open' | 'closing-soon' | 'overdue' | 'decided'

export function classifyConsultationStatus(input: {
  deadline: Date | null
  decided: boolean
  now: Date
}): ConsultationStatus {
  if (input.decided) return 'decided'
  if (!input.deadline) return 'open'
  const diffMs = input.deadline.getTime() - input.now.getTime()
  if (diffMs < 0) return 'overdue'
  if (diffMs <= MS_PER_DAY) return 'closing-soon'
  return 'open'
}

/**
 * iter1028 basics: ConsultationStatus → 共通 `Severity` ('ok'/'info'/'warn'/'danger'/'muted') bridge。
 *
 * 配色 token (SeverityChip tone bind 用):
 *   - 'decided'      → 'ok'     (= 緑、判断完了、healthy)
 *   - 'open'         → 'info'   (= 青、受付中、進行中)
 *   - 'closing-soon' → 'warn'   (= 黄、締切 24h 以内、決断推奨)
 *   - 'overdue'      → 'danger' (= 赤、判断漏れ、即対応)
 *
 * iter535 severity-bridges に並ぶ「domain status → 共通 Severity」 pattern の相談軸版。
 * caller (= 相談 widget chip / 相談 list panel header / Slack 通知 tone) は本 bridge で
 * SeverityChip の tone を 1 関数で決定可能 (= 配色実装の散在を防ぐ)。
 *
 * muted は使わない (= 全 4 状態が「相談として valid な存在」、未設定は ConsultationStatus
 * 自体になり得ない、type で守る)。
 */
export function consultationStatusSeverity(status: ConsultationStatus): Severity {
  switch (status) {
    case 'decided':
      return 'ok'
    case 'open':
      return 'info'
    case 'closing-soon':
      return 'warn'
    case 'overdue':
      return 'danger'
  }
}

/**
 * iter1028 basics: ConsultationStatus → 日本語短ラベル。
 *
 * 配色と合わせて chip text / aria-label / Slack 通知 で使う共通 vocabulary。
 *
 *   - 'open'         → '受付中'
 *   - 'closing-soon' → '締切間近'
 *   - 'overdue'      → '判断漏れ'
 *   - 'decided'      → '決定済'
 *
 * iter546 `gtdBucketLabelJa` / iter537 `formatHandoffPhaseStatusJa` と並ぶ「domain status →
 * 日本語短ラベル」 pattern の相談軸版。caller (= 相談 widget chip / list / Slack 通知) で再利用。
 */
const CONSULTATION_STATUS_LABEL_JA: Record<ConsultationStatus, string> = {
  open: '受付中',
  'closing-soon': '締切間近',
  overdue: '判断漏れ',
  decided: '決定済',
}

export function formatConsultationStatusJa(status: ConsultationStatus): string {
  return CONSULTATION_STATUS_LABEL_JA[status]
}

/**
 * iter1030 ai-automation: ConsultationStatus → 共通 `ChipTone` (6 値 vocab) bridge。
 *
 * iter1039 refactor: 内部 mapping を共通 `severityToChipTone` (lib/widget/severity-bridges) に
 * 委譲 (`consultationStatusSeverity(status)` → `severityToChipTone(sev)` の 2 段)、inline
 * Record duplicate を排除。
 *
 * 配色 token:
 *   'decided'      → 'success' (= 緑、判断完了、healthy 強調 = 6 軸 (5) やる気 positive framing)
 *   'open'         → 'info'    (= 青、受付中、進行中)
 *   'closing-soon' → 'warn'    (= 黄、締切 24h 以内、決断推奨)
 *   'overdue'      → 'danger'  (= 赤、判断漏れ、即対応)
 *
 * 用途:
 *   - dashboard 相談 chip (SeverityChip ではなく ChipTone bind の chip 群、cost-chip 等と並ぶ)
 *   - Slack daily digest 「相談 status: <chip>」 tone bind
 *   - AgentBriefSignal の tone field 直 bind
 */
import { severityToChipTone } from '@/lib/widget/severity-bridges'

export function consultationStatusChipTone(status: ConsultationStatus): ChipTone {
  return severityToChipTone(consultationStatusSeverity(status))
}

/**
 * iter1031 basics: workspace 内 相談 status の集計から **headline 1 行** (chip 配色と整合) を返す
 * compact format。
 *
 * 優先表示順 (severity 重み): overdue > closing-soon > open > decided。最も severe な軸を
 * headline に採用し、残り軸は省略 (= 6 軸 (3) 認知低減 = 1 chip に「最重要 1 行」のみ)。
 *
 * 出力:
 *   - all 0 → '相談なし'                              (= 該当 task なし、idle)
 *   - overdue > 0 → '判断漏れ N 件'                  (danger 軸を最優先)
 *   - closing-soon > 0 → '締切間近 N 件'             (warn)
 *   - open > 0 → '受付中 N 件'                       (info)
 *   - decided only > 0 → '決定済 N 件'               (success)
 *
 * iter1023 `formatAgingSeverityCompactJa` と同 pattern (= severity ヘッダ word + count 数値)
 * の相談軸版。caller (= dashboard chip / Slack daily digest / AI prompt) は本 compact 1 行で
 * 「相談 status の最重要 framing」 を取得可能。
 */
export type ConsultationCounts = Readonly<Record<ConsultationStatus, number>>

export function formatConsultationCountsCompactJa(counts: ConsultationCounts): string {
  if (counts.overdue > 0) return `判断漏れ ${counts.overdue} 件`
  if (counts['closing-soon'] > 0) return `締切間近 ${counts['closing-soon']} 件`
  if (counts.open > 0) return `受付中 ${counts.open} 件`
  if (counts.decided > 0) return `決定済 ${counts.decided} 件`
  return '相談なし'
}

/**
 * iter1031 basics: ConsultationCounts → ChipTone (= 最 severe 軸の tone を採用)。
 *
 * `formatConsultationCountsCompactJa` と整合する tone 軸:
 *   - overdue > 0 → 'danger'
 *   - closing-soon > 0 → 'warn'
 *   - open > 0 → 'info'
 *   - decided only > 0 → 'success'
 *   - all 0 → 'idle'
 */
export function consultationCountsChipTone(counts: ConsultationCounts): ChipTone {
  if (counts.overdue > 0) return 'danger'
  if (counts['closing-soon'] > 0) return 'warn'
  if (counts.open > 0) return 'info'
  if (counts.decided > 0) return 'success'
  return 'idle'
}

/**
 * iter1031 basics: consultation counts を `AgentBriefSignal` 形式 (text + tone) に変換する
 * compose helper。
 *
 * iter794-797 + iter1025 `*ToBriefSignal` pattern (= 8 + 1 axes 弾) の相談軸版で AI 朝 brief /
 * Slack daily digest / dashboard chip area に 1 chip 渡せる。text は `formatConsultationCountsCompactJa`
 * (= headline 1 行)、tone は `consultationCountsChipTone` (= 最 severe 軸の tone) を再利用 (=
 * chip 配色と signal tone が完全一致)。
 *
 * caller pattern:
 *   const counts = items.reduce(...)  // status 別件数
 *   const signal = consultationCountsToBriefSignal(counts)
 *   // → composeAnalyticsSignals 風に concat、または単独 chip render
 */
export function consultationCountsToBriefSignal(counts: ConsultationCounts): AgentBriefSignal {
  return {
    text: formatConsultationCountsCompactJa(counts),
    tone: consultationCountsChipTone(counts),
  }
}
