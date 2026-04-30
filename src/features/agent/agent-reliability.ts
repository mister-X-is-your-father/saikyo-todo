/**
 * iter487 ai-automation: AI agent 信頼性 (success rate / failure rate) を集計する pure helper。
 *
 * `cost-aggregate.ts` の `MonthlyCostRow` には `invocations` / `completed` / `failed`
 * が含まれているが、AI brief / dashboard widget で「PM agent: 14/15 完了 (93%) /
 * Researcher: 8/8 完了 (100%) — 健全」のような **役割別 信頼性 chip** を出すには
 * caller 側で reduce / divide / format を毎回書く必要があった。本 helper で
 * 1 関数集約。
 *
 * iter479 (cost-month-projection) / iter484 (cost-trend-by-role) と同じ「cost-aggregate
 * の rows を受け取って 1 行 summary を返す」パターン。pre-mortem / pm-recovery 等の
 * worker が「agent が信頼できる状態か?」を 1 関数で判定可能。
 *
 * 仕様:
 *  - 入力 `rows`: `MonthlyCostRow` 互換 (`{ role, invocations, completed, failed }` を持つ
 *    structural subset)。複数月でも単月でもよい (本 helper は role ごとに sum するだけ)
 *  - 入力 `roles`: 集計対象の role list (default: ['pm', 'researcher'])。未知 role は
 *    結果から除外 (forward compatible、将来 'engineer' が増えた時)
 *  - 出力 `AgentReliability`:
 *      totalInvocations / completedCount / failedCount / successRate (0..1)、
 *      byRole で各 role の同じ stats、reliabilityLevel ('healthy' / 'warn' / 'critical' / 'idle')
 *  - reliabilityLevel 判定 (success rate ベース):
 *      idle:    invocations === 0 (= まだ呼び出しなし)
 *      healthy: rate >= 0.95 (= 95% 以上完了、健全)
 *      warn:    0.80 <= rate < 0.95 (= 1 割失敗、注意)
 *      critical: rate < 0.80 (= 2 割以上失敗、要調査)
 *  - successRate は invocations === 0 で 0 を返す (= caller は idle level でフィルタ)
 *  - failed は cancelled / quota_exceeded 等の非 retry-able 失敗を含む想定 (= cost-aggregate.ts と整合)
 *
 * graphical 波及 (iter481-486):
 *  - reliabilityLevel → ChipTone (severity 軸): idle→'idle' / healthy→'success' /
 *    warn→'warn' / critical→'danger' (= positive 軸 'success' を使用、iter486 で追加)
 */

import { rateToPct } from '@/lib/format-rate'
import { type ChipTone, type ChipToneClasses, getChipToneClasses } from '@/lib/ui/chip-tone'

export type AgentRole = 'pm' | 'researcher'

export type ReliabilityLevel = 'healthy' | 'warn' | 'critical' | 'idle'

export interface RoleReliability {
  role: AgentRole
  invocations: number
  completed: number
  failed: number
  successRate: number
  reliabilityLevel: ReliabilityLevel
}

export interface AgentReliability {
  totalInvocations: number
  completedCount: number
  failedCount: number
  successRate: number
  reliabilityLevel: ReliabilityLevel
  byRole: Record<AgentRole, RoleReliability>
}

const DEFAULT_ROLES: readonly AgentRole[] = ['pm', 'researcher'] as const

const HEALTHY_THRESHOLD = 0.95
const WARN_THRESHOLD = 0.8

function clampNonNeg(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0
  return n
}

function judgeLevel(invocations: number, successRate: number): ReliabilityLevel {
  if (invocations === 0) return 'idle'
  if (successRate >= HEALTHY_THRESHOLD) return 'healthy'
  if (successRate >= WARN_THRESHOLD) return 'warn'
  return 'critical'
}

export function computeAgentReliability(
  rows: readonly { role: string; invocations: number; completed: number; failed: number }[],
  roles: readonly AgentRole[] = DEFAULT_ROLES,
): AgentReliability {
  const byRole: Record<AgentRole, RoleReliability> = Object.fromEntries(
    roles.map((r) => [
      r,
      {
        role: r,
        invocations: 0,
        completed: 0,
        failed: 0,
        successRate: 0,
        reliabilityLevel: 'idle',
      },
    ]),
  ) as Record<AgentRole, RoleReliability>

  for (const row of rows) {
    if (!roles.includes(row.role as AgentRole)) continue
    const r = byRole[row.role as AgentRole]
    r.invocations += clampNonNeg(row.invocations)
    r.completed += clampNonNeg(row.completed)
    r.failed += clampNonNeg(row.failed)
  }

  let totalInvocations = 0
  let totalCompleted = 0
  let totalFailed = 0
  for (const r of Object.values(byRole)) {
    r.successRate = r.invocations > 0 ? r.completed / r.invocations : 0
    r.reliabilityLevel = judgeLevel(r.invocations, r.successRate)
    totalInvocations += r.invocations
    totalCompleted += r.completed
    totalFailed += r.failed
  }

  const successRate = totalInvocations > 0 ? totalCompleted / totalInvocations : 0
  return {
    totalInvocations,
    completedCount: totalCompleted,
    failedCount: totalFailed,
    successRate,
    reliabilityLevel: judgeLevel(totalInvocations, successRate),
    byRole,
  }
}

const ROLE_LABEL_JA: Record<AgentRole, string> = {
  pm: 'PM',
  researcher: 'Researcher',
}

const LEVEL_LABEL_JA: Record<ReliabilityLevel, string> = {
  healthy: '健全',
  warn: '注意',
  critical: '要調査',
  idle: '記録なし',
}

/**
 * iter492 ai-automation: role / level の ja-JP 短ラベルを public export 化。
 * 既存 `formatAgentReliabilityJa` は両ラベル + 件数 + % + 'AI 信頼性: ' prefix を
 * 1 行にまとめるが、caller が **個別組合せ** (例: Slack attachment per-role 別、
 * dashboard widget の hover tooltip) で文言を組み立てたい時に直接 ラベルが取れる。
 *
 * ラベル仕様 (短縮、UI vocabulary):
 *  - role: pm → 'PM' / researcher → 'Researcher'
 *  - level: healthy → '健全' / warn → '注意' / critical → '要調査' / idle → '記録なし'
 *
 * iter491 chipToneLabelJa との対比:
 *  - chipToneLabelJa は **tone (視覚配色軸)** のラベル ('緊急'/'達成' 等)
 *  - 本 helper は **domain 固有 (信頼性 level / role 名)** のラベル
 *  - caller は 2 つを組み合わせて 'PM 健全 (達成)' のような richer 文言を作れる
 */
export function agentRoleLabelJa(role: AgentRole): string {
  return ROLE_LABEL_JA[role]
}

export function reliabilityLevelLabelJa(level: ReliabilityLevel): string {
  return LEVEL_LABEL_JA[level]
}

/**
 * iter494 ai-automation: 期間内で **invocations 数が最も多い role** (= 主軸 role) を
 * 特定する pure helper。AI 朝 brief / dashboard widget で「今月は PM が主軸」
 * 「Researcher が主軸」のような 1 行 chip を出す substrate。
 *
 * 仕様:
 *  - 入力 `stats`: `AgentReliability` (compute 済の集計結果)
 *  - 出力: `DominantRoleResult { role, invocations, share }` or null (= 全 idle)
 *  - share = role.invocations / totalInvocations (0..1)
 *  - tie (= 同 invocation 数) は role 名 alphabetical で先勝ち (pm > researcher)
 *  - 全 role idle (totalInvocations=0) → null sentinel
 *
 * 使い分け:
 *  - cost ベースの主軸 → caller が cost 比較 logic を別途実装 (本 helper は invocation
 *    数のみ、= 「実行回数 = 主軸」の自然解釈)
 */
export interface DominantRoleResult {
  role: AgentRole
  invocations: number
  /** 全体に占める比率 (0..1)、Math.round で 2 桁丸めしない (= 整数 % 化は caller 責任) */
  share: number
}

export function dominantRole(stats: AgentReliability): DominantRoleResult | null {
  if (stats.totalInvocations === 0) return null
  let best: DominantRoleResult | null = null
  for (const role of ['pm', 'researcher'] as const) {
    const r = stats.byRole[role]
    const candidate = {
      role,
      invocations: r.invocations,
      share: r.invocations / stats.totalInvocations,
    }
    if (!best || candidate.invocations > best.invocations) {
      best = candidate
    }
  }
  return best
}

/**
 * 主軸 role を ja-JP 1 行に整形 (chip / aria-label / AI brief 共通)。
 *  - null → '主軸: 記録なし'
 *  - else → '主軸: PM (15/23 呼出、65%)' / '主軸: Researcher (8/8 呼出、100%)'
 *  - share=1 (= 唯一稼働) → '主軸: PM (15 呼出、唯一稼働)' (caller に「もう 1 つは
 *    idle」を視覚的に伝える)
 */
export function formatDominantRoleJa(dominant: DominantRoleResult | null): string {
  if (!dominant) return '主軸: 記録なし'
  const label = ROLE_LABEL_JA[dominant.role]
  if (dominant.share >= 1) {
    return `主軸: ${label} (${dominant.invocations} 呼出、唯一稼働)`
  }
  const pct = rateToPct(dominant.share)
  // share の denominator は totalInvocations 全体。caller が dominant 単独で
  // formatDominantRoleJa を呼ぶときは AgentReliability の他 role 数まで
  // 知らないので、ここでは dominant.invocations と % のみ表示。
  return `主軸: ${label} (${dominant.invocations} 呼出、${pct}%)`
}

/**
 * iter497 ai-automation: AI 朝 brief / Slack daily digest 用に「reliability + dominant
 * role」 2 視点を 1 構造体に集約する compose helper。
 *
 * caller benefits: AI 朝 brief / dashboard widget で「stats から個別に reliability /
 * dominant の 2 関数呼び」が「compose 1 関数で signals 配列が揃う」に変わる、UI で
 * `signals.map(s => <Chip text={s.text} tone={s.tone} />)` のような 1 行 render。
 *
 * 仕様:
 *  - 入力: AgentReliability (compute 済)
 *  - 出力: AgentBriefSignals { reliability: {text, tone}, dominantRole: {text, tone} | null }
 *  - reliability は 必ず 1 signal (idle 時も 'AI 信頼性: 記録なし' chip 表示)
 *  - dominantRole は idle (= totalInvocations=0) 時 null、それ以外は dominantRole result
 *  - tone は iter487/494 で確立した
 *    `agentReliabilityTone` / 主軸の場合は 'info' (中立、informational signal) を採用
 *  - signals 配列形式は AI brief / Slack 通知 / dashboard chip 共通 format
 */
export interface AgentBriefSignal {
  text: string
  tone: ChipTone
}

export interface AgentBriefSignals {
  reliability: AgentBriefSignal
  /** dominantRole は totalInvocations=0 時 null */
  dominantRole: AgentBriefSignal | null
}

export function composeAgentBriefSignals(stats: AgentReliability): AgentBriefSignals {
  const reliability: AgentBriefSignal = {
    text: formatAgentReliabilityCompactJa(stats),
    tone: agentReliabilityTone(stats.reliabilityLevel),
  }
  const dominant = dominantRole(stats)
  const dominantSignal: AgentBriefSignal | null = dominant
    ? {
        text: formatDominantRoleJa(dominant),
        // dominant role は informational (= 'info' tone)。severity は reliability 側で持つ
        tone: 'info',
      }
    : null
  return { reliability, dominantRole: dominantSignal }
}

/**
 * AI 朝 brief / chip 表示用に reliability を 1 行 ja-JP 文言で:
 *  - idle → 'AI 信頼性: 記録なし'
 *  - 全 role healthy → 'AI 信頼性: PM 14/15 (93%) 健全・Researcher 8/8 (100%) 健全'
 *  - role 別 level → 各 role の (完了/総数 (率) level) を中黒で連結
 */
export function formatAgentReliabilityJa(stats: AgentReliability): string {
  if (stats.reliabilityLevel === 'idle') return 'AI 信頼性: 記録なし'
  const parts: string[] = []
  for (const role of ['pm', 'researcher'] as const) {
    const r = stats.byRole[role]
    if (!r) continue
    const label = ROLE_LABEL_JA[role]
    if (r.reliabilityLevel === 'idle') {
      parts.push(`${label} 記録なし`)
    } else {
      const pct = rateToPct(r.successRate)
      const levelLabel = LEVEL_LABEL_JA[r.reliabilityLevel]
      parts.push(`${label} ${r.completed}/${r.invocations} (${pct}%) ${levelLabel}`)
    }
  }
  return `AI 信頼性: ${parts.join('・')}`
}

/**
 * iter489 ai-automation: 全 role 集約のみの **compact** 1 行 ja-JP 文言。dashboard
 * widget の小型 chip / Slack 通知 ペイロード / AI brief の冒頭 1 行で「AI 全体は
 * 健全か?」を一目で判断するための簡潔版。
 *
 *  - idle → 'AI 信頼性: 記録なし' (formatAgentReliabilityJa と同 sentinel)
 *  - else → 'AI 信頼性: 健全 (22/23 完了)' / 'AI 信頼性: 注意 (20/22 完了)' 等
 *    role 別の詳細は省く (= caller が disclosure で `formatAgentReliabilityJa`
 *    を出すパターン想定)
 *
 * iter479 `formatCostMonthProjectionJa` の冒頭 emoji (⚠ / 🚨) は本 helper では
 * 使わず、tone は caller が `agentReliabilityChipClasses` で chip 配色する想定
 * (= 文字側は素直なテキスト、視覚は chip 配色)。
 */
export function formatAgentReliabilityCompactJa(stats: AgentReliability): string {
  if (stats.reliabilityLevel === 'idle') return 'AI 信頼性: 記録なし'
  const pct = rateToPct(stats.successRate)
  const levelLabel = LEVEL_LABEL_JA[stats.reliabilityLevel]
  return `AI 信頼性: ${levelLabel} (${stats.completedCount}/${stats.totalInvocations} 完了、${pct}%)`
}

/**
 * graphical 波及: reliabilityLevel → ChipTone (severity 軸 + positive 軸の 'success'):
 *  - 'critical' → 'danger' (rose、要調査)
 *  - 'warn'     → 'warn' (amber 薄、注意)
 *  - 'healthy'  → 'success' (emerald、健全) ← iter486 で追加 'success' tone を 2 件目活用
 *  - 'idle'     → 'idle' (slate、記録なし)
 */
const LEVEL_TO_TONE: Record<ReliabilityLevel, ChipTone> = {
  critical: 'danger',
  warn: 'warn',
  healthy: 'success',
  idle: 'idle',
}

export function agentReliabilityTone(level: ReliabilityLevel): ChipTone {
  return LEVEL_TO_TONE[level]
}

/** alias to ChipToneClasses (`@/lib/ui/chip-tone`)。caller の import path を維持。 */
export type AgentReliabilityChipClasses = ChipToneClasses

export function agentReliabilityChipClasses(level: ReliabilityLevel): AgentReliabilityChipClasses {
  return getChipToneClasses(LEVEL_TO_TONE[level])
}
