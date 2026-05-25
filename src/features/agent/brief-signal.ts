/**
 * iter800 refactor: AI 朝 brief / Slack daily digest / dashboard chip area で
 * 共通の signal 型 (text + tone) を 1 箇所に集約。
 *
 * 経緯: iter497 で `AgentBriefSignal` を agent-reliability.ts 内に定義したが、
 * iter794 以降 cost-month-projection / cost-monthly-trend / momentum /
 * weekly-completion-insight / due-hit-rate などの **agent 以外** の helper も
 * 同型を採用したことで、型を agent-reliability から import する semantically
 * odd な依存 (item/momentum.ts → agent/agent-reliability.ts) が複数箇所で発生。
 *
 * 本モジュールに type を分離することで:
 *  - 型の semantic owner が「analytics chip 共通 vocabulary」 になる
 *  - import 1 行が「agent 信頼性の派生」 ではなく「共通 signal 型」 と読める
 *  - agent-reliability.ts は signal 型の定義から解放され、reliability 専用 logic に集中
 *
 * 後方互換: agent-reliability.ts は本モジュールから re-export することで
 * 既存 import (例: `composeAgentBriefSignals` の戻り値型推論) を維持。
 */

import { type ChipTone } from '@/lib/ui/chip-tone'

/**
 * AI 朝 brief / Slack daily digest / dashboard chip area で 1 chip を表現する
 * 共通 signal 型。analytics-signals.ts の `composeAnalyticsSignals` 出力 +
 * 各 helper の `*ToBriefSignal` 戻り値で共通使用。
 *
 *  - text: 1 行 ja-JP 文言 (compact 推奨、chip 内に表示する短文)
 *  - tone: ChipTone (severity 軸 + positive 軸 'success' を含む 5 段階共通 vocab)
 */
export interface AgentBriefSignal {
  text: string
  tone: ChipTone
}

/**
 * iter1333 ai-automation: AgentBriefSignal[] を `text` の ` / ` 連結 1 行に整形。
 *
 * AI 朝 brief prompt / Slack daily digest の plain text channel で「signal text を
 * 区切りで並べる」 idiom を共通 vocab の home に集約。analytics-signals の
 * `formatAnalyticsSignalsLineJa` (全 signal) も `pickTopSeveritySignals` の top-N も
 * 本 helper 1 つで line 化できる (= 重複していた `.map(s => s.text).join(' / ')` を集約)。
 *
 *  - 空配列 → emptyText (default '記録なし')
 *  - tone は plain text では落とす (= 視覚 chip 経路でのみ使う)
 */
export function formatBriefSignalsLineJa(
  signals: readonly AgentBriefSignal[],
  emptyText = '記録なし',
): string {
  if (signals.length === 0) return emptyText
  return signals.map((s) => s.text).join(' / ')
}
