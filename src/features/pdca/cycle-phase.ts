/**
 * iter1410 (queue PDCA P-3 substrate): PDCA cycle の phase 進行ガード pure helper。
 *
 * 設計目的 (FEEDBACK_QUEUE.md 「PDCA mode 抜本再設計」 P-3):
 *   - 4-tab UI (Plan/Do/Check/Act) の「次 phase へ」 button が、空の Plan のまま Do に
 *     進む等の「型崩れ」 を防ぐ。各 phase の最低限の入力を満たさないと advance させない。
 *   - service の advancePhase が本 helper で検証 → ok なら status 更新 + 打刻 + audit。
 *
 * 必須条件 (思考の型を強制 = 設計哲学「思考力」):
 *   - plan → do:    hypothesis (仮説) が必須
 *   - do → check:   追加必須なし (実行は外で起きる)
 *   - check → act:  actualValue か checkFindings のどちらか (= 検証結果) が必須
 *   - act → closed: actDecisions (改善決定) が必須
 *   - closed:       終端、これ以上 advance 不可
 *
 * pdca-cycle.ts schema の型を直 import せず最小 interface で受ける (pure helper 分離)。
 * AI 不使用、副作用無し。pure helper + Vitest 単体で網羅。
 */

export type PdcaPhase = 'plan' | 'do' | 'check' | 'act' | 'closed'

export const PDCA_PHASE_ORDER: readonly PdcaPhase[] = ['plan', 'do', 'check', 'act', 'closed']

const PHASE_LABEL_JA: Record<PdcaPhase, string> = {
  plan: 'Plan (計画)',
  do: 'Do (実行)',
  check: 'Check (検証)',
  act: 'Act (改善)',
  closed: 'Closed (凍結)',
}

export interface CyclePhaseFields {
  status: PdcaPhase
  hypothesis?: string | null
  actualValue?: string | null
  checkFindings?: string | null
  actDecisions?: string | null
}

export interface AdvancePhaseCheck {
  /** advance 可能か */
  ok: boolean
  /** 進める先 (closed は null) */
  nextPhase: PdcaPhase | null
  /** 不足している必須入力の日本語ラベル (ok=true なら空) */
  missing: string[]
}

export function phaseLabelJa(phase: PdcaPhase): string {
  return PHASE_LABEL_JA[phase]
}

export function nextPhase(status: PdcaPhase): PdcaPhase | null {
  const idx = PDCA_PHASE_ORDER.indexOf(status)
  if (idx < 0 || idx >= PDCA_PHASE_ORDER.length - 1) return null
  return PDCA_PHASE_ORDER[idx + 1] ?? null
}

function isBlank(s: string | null | undefined): boolean {
  return (s ?? '').trim() === ''
}

export function canAdvancePhase(cycle: CyclePhaseFields): AdvancePhaseCheck {
  const next = nextPhase(cycle.status)
  if (next === null) {
    return { ok: false, nextPhase: null, missing: [] }
  }

  const missing: string[] = []
  switch (cycle.status) {
    case 'plan':
      if (isBlank(cycle.hypothesis)) missing.push('仮説 (hypothesis)')
      break
    case 'check':
      if (isBlank(cycle.actualValue) && isBlank(cycle.checkFindings)) {
        missing.push('実測値 または 学び (actualValue / checkFindings)')
      }
      break
    case 'act':
      if (isBlank(cycle.actDecisions)) missing.push('改善決定 (actDecisions)')
      break
    // 'do' は追加必須なし
    default:
      break
  }

  return { ok: missing.length === 0, nextPhase: next, missing }
}
