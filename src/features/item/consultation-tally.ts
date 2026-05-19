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
  if (diffMs <= 24 * 60 * 60 * 1000) return 'closing-soon'
  return 'open'
}
