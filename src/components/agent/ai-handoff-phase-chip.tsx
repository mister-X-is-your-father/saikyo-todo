/**
 * iter539 (queue AI 分業 AC-1 wire-up): AI hand-off phase chip。
 *
 * 設計目的 (FEEDBACK_QUEUE.md AC-1):
 *   - iter537 着地の `getAiHandoffPhase` + `getHandoffPhaseDescriptor` を消費する
 *     SeverityChip wrapper
 *   - ItemEditDialog の AI 担当 section / Item card / Backlog row 等で「今この item は
 *     AI hand-off の どの段階か」 を 1 chip で表示
 *   - 「AI に任せた」ワークフローの可視化 を 1 component で完結 (caller は item +
 *     comments を渡すだけ)
 *
 * 副作用なし、依存は handoff-phase pure helper + SeverityChip + AssigneeRef type。
 */
import {
  getAiHandoffPhase,
  getHandoffPhaseDescriptor,
  type HandoffItemFields,
  type HandoffSignals,
} from '@/features/agent/handoff-phase'

import { SeverityChip } from '@/components/shared/severity-chip'

interface Props {
  item: HandoffItemFields
  signals: HandoffSignals
  /** description 表示の有無 (default false、chip のみ) */
  showDescription?: boolean
  /** chip 追加 className */
  className?: string
  /** click handler (chip 全体)、未指定なら static */
  onClick?: () => void
  testId?: string
}

/**
 * AI hand-off の 6 phase を 1 chip で表示。
 * status='done' / no-ai / pending-handoff / plan-ready / in-execution / review-requested の
 * いずれかを SeverityChip で render、phase ごとに severity 配色 (ok/info/warn/muted) 連動。
 */
export function AiHandoffPhaseChip({
  item,
  signals,
  showDescription,
  className,
  onClick,
  testId,
}: Props) {
  const phase = getAiHandoffPhase(item, signals)
  const desc = getHandoffPhaseDescriptor(phase)

  return (
    <div className="space-y-1" data-testid={testId ?? `ai-handoff-${phase}`}>
      {/* iter1187: 旧 ariaLabel `AI hand-off: ${chipLabel}` は visible {chipLabel} を
          中位置 "AI hand-off: **chipLabel**" に持ち voice control prefix-matching
          「click {chipLabel}」 match 不可 (substring 一致のみ)。visible 冒頭固定 +
          em-dash 区切で descriptive 末尾保持 (iter1093-1186 sweep convention)。 */}
      <SeverityChip
        severity={desc.severity}
        label={desc.chipLabel}
        ariaLabel={`${desc.chipLabel} — AI hand-off`}
        onClick={onClick}
        className={className}
        testId={`ai-handoff-chip-${phase}`}
      />
      {showDescription ? <p className="text-muted-foreground text-xs">{desc.description}</p> : null}
    </div>
  )
}
