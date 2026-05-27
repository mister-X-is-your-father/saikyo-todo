/**
 * iter1416 (queue チームメンバー余裕時間 scope C substrate): overload member の負荷を
 * 余裕 member へ移す「移管提案」 pure helper。
 *
 * 設計目的 (FEEDBACK_QUEUE.md チームメンバー余裕時間 scope C):
 *   - 「割り振りすぎ」 検知 → 余裕ある member への移管 suggestion (例: 「田中さんが overload、
 *     佐藤さんが余裕、移管しますか?」)。
 *   - computeTeamCapacityLoads の結果 (member × load) を入力に、超過分を slack のある member に
 *     greedy 配分した提案リストを deterministic に返す (実移管は service、本 helper は提案だけ)。
 *
 * 方針:
 *   - overloaded (remainingMinutes < 0) を超過分 多い順に処理。
 *   - donor = loadStatus 'free' / 'comfortable' かつ remainingMinutes > 0 の member、slack 多い順。
 *   - 各 overloaded の超過を donor の slack に min() で順次割当 (donor slack は逐次減算)。
 *
 * 副作用無し・AI 不使用。pure helper + Vitest 単体で網羅。
 */
import { formatMinutesJa } from '@/lib/format-duration'

import type { MemberCapacityLoad } from './member-capacity'
import type { TeamCapacityMember } from './team-capacity'

export interface CapacityRebalanceMemberInput {
  member: TeamCapacityMember
  load: MemberCapacityLoad
}

export interface CapacityRebalanceSuggestion {
  from: TeamCapacityMember
  to: TeamCapacityMember
  /** 移管提案する分数 (> 0) */
  minutes: number
}

export function suggestCapacityRebalance(
  members: readonly CapacityRebalanceMemberInput[],
): CapacityRebalanceSuggestion[] {
  const overloaded = members
    .filter((m) => m.load.remainingMinutes < 0)
    .map((m) => ({ member: m.member, excess: -m.load.remainingMinutes }))
    .sort((a, b) => b.excess - a.excess)

  const donors = members
    .filter(
      (m) =>
        m.load.remainingMinutes > 0 &&
        (m.load.loadStatus === 'free' || m.load.loadStatus === 'comfortable'),
    )
    .map((m) => ({ member: m.member, slack: m.load.remainingMinutes }))
    .sort((a, b) => b.slack - a.slack)

  const suggestions: CapacityRebalanceSuggestion[] = []

  for (const o of overloaded) {
    let remainingExcess = o.excess
    for (const d of donors) {
      if (remainingExcess <= 0) break
      if (d.slack <= 0) continue
      const move = Math.min(remainingExcess, d.slack)
      if (move <= 0) continue
      suggestions.push({ from: o.member, to: d.member, minutes: move })
      d.slack -= move
      remainingExcess -= move
    }
  }

  return suggestions
}

function memberName(m: TeamCapacityMember): string {
  return (m.displayName ?? '').trim() || m.actorId
}

/**
 * 移管提案を 1 行 ja に整形。
 *   '田中 → 佐藤: 1時間30分 移管'
 */
export function formatRebalanceSuggestionJa(s: CapacityRebalanceSuggestion): string {
  return `${memberName(s.from)} → ${memberName(s.to)}: ${formatMinutesJa(s.minutes)} 移管`
}

// test しやすく named export
export { memberName }
