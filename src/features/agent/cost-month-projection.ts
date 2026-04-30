/**
 * iter479 ai-automation: AI コスト 月末予測 pure helper。
 *
 * `getBudgetStatus` (Phase 6.9 cost-budget.ts) は **月初からの累積 spent** と limit
 * を取得して「現時点で 80%」「現時点で超過」を判定する。だが、月初から数日で 80%
 * 到達した場合の「このペースでいくと月末いくらに着地するか」は inline で extrapolate
 * していて、AI 朝 brief / dashboard widget / pm-agent が 1 関数で取り出せなかった。
 *
 * iter332 `cost-monthly-trend.ts` (this vs prior month) と対称な「月末着地予測」
 * substrate。線形外挿 (= `spent / daysElapsed * daysInMonth`) で月末予測 USD を
 * 出し、limit と比較して riskLevel ('safe' / 'warn' / 'over') を返す。caller は
 * 1 関数で chip 表示 / budget 早期警告 / Slack 通知ペイロード生成が完成する。
 *
 * 仕様:
 *   - 入力 `thisMonthUsd`: 月初から today までの累積 USD (`getBudgetStatus.spent`)
 *   - 入力 `today`: 'YYYY-MM-DD'。day-of-month を抽出
 *   - 入力 `monthlyLimitUsd`: nullable、null なら limit 無し (riskLevel='safe' 固定)
 *   - 入力 `warnThresholdRatio`: default 0.8 (workspace_settings 既存値と整合)
 *   - daysInMonth = `new Date(year, month, 0).getDate()` で UTC 計算 (1〜31)
 *   - daysElapsed = today の day-of-month (1〜31)、daysRemaining = inMonth - elapsed
 *   - projectedUsd = thisMonthUsd / daysElapsed * daysInMonth (= 線形ペース外挿)
 *   - daysElapsed=0 (不正 today) → idle 状態 (projection なし)
 *   - thisMonthUsd<=0 → projected=0
 *   - riskLevel:
 *       limit==null → 'safe'
 *       projected < limit * warn → 'safe'
 *       limit*warn <= projected < limit → 'warn'
 *       projected >= limit → 'over'
 *
 * 線形外挿の限界は caller が把握すべき:
 *   - 月初 1〜3 日は誤差大 (low confidence、caller が「予測精度低」 chip 検討)
 *   - 月末手前 (daysRemaining<=2) は extrapolation がほぼ実 spent と等しい
 *   - AI invocation の頻度が均等でない場合 (例: 月末集中) は projection が低めに出る
 */

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/

const DEFAULT_WARN_THRESHOLD = 0.8

export type CostMonthProjectionRisk = 'safe' | 'warn' | 'over' | 'idle'

export interface CostMonthProjection {
  /** 月初から today までの累積 USD (input そのまま、不正値は 0 にクランプ) */
  thisMonthUsd: number
  /** 月末予測 USD (線形外挿)。idle 時は 0 */
  projectedUsd: number
  /** 設定された上限 (USD)。null なら無制限 */
  limitUsd: number | null
  /** today の day-of-month (1〜31)、不正 today は 0 */
  daysElapsed: number
  /** 当月の総日数 (28〜31)、idle 時は 0 */
  daysInMonth: number
  /** 残り日数 = daysInMonth - daysElapsed (今日含めず)、idle 時は 0 */
  daysRemaining: number
  /** projected が limit*warn を超えるか (limit==null は false) */
  warnTriggered: boolean
  /** projected >= limit (limit==null は false) */
  exceedsLimit: boolean
  /** 'safe' / 'warn' / 'over' / 'idle' */
  riskLevel: CostMonthProjectionRisk
}

function safeUsd(usd: number): number {
  if (!Number.isFinite(usd) || usd <= 0) return 0
  return usd
}

function parseToday(today: string): { year: number; month: number; day: number } | null {
  const m = today.match(ISO_DATE_RE)
  if (!m) return null
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  if (month < 1 || month > 12) return null
  if (day < 1 || day > 31) return null
  return { year, month, day }
}

function daysInMonthUtc(year: number, month: number): number {
  // new Date(year, month, 0) で前月末日 = month の総日数
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

export interface CostMonthProjectionInput {
  thisMonthUsd: number
  today: string
  monthlyLimitUsd?: number | null
  warnThresholdRatio?: number
}

export function computeCostMonthProjection(input: CostMonthProjectionInput): CostMonthProjection {
  const parsed = parseToday(input.today)
  const limitUsd =
    input.monthlyLimitUsd != null &&
    Number.isFinite(input.monthlyLimitUsd) &&
    input.monthlyLimitUsd > 0
      ? input.monthlyLimitUsd
      : null
  const thisMonthUsd = safeUsd(input.thisMonthUsd)

  if (!parsed) {
    return {
      thisMonthUsd,
      projectedUsd: 0,
      limitUsd,
      daysElapsed: 0,
      daysInMonth: 0,
      daysRemaining: 0,
      warnTriggered: false,
      exceedsLimit: false,
      riskLevel: 'idle',
    }
  }

  const daysInMonth = daysInMonthUtc(parsed.year, parsed.month)
  const daysElapsed = Math.min(parsed.day, daysInMonth) // safety clamp
  const daysRemaining = Math.max(0, daysInMonth - daysElapsed)

  const projectedUsd = daysElapsed > 0 ? (thisMonthUsd / daysElapsed) * daysInMonth : 0

  let riskLevel: CostMonthProjectionRisk
  let warnTriggered = false
  let exceedsLimit = false
  if (limitUsd == null) {
    riskLevel = 'safe'
  } else {
    const warn =
      input.warnThresholdRatio != null && Number.isFinite(input.warnThresholdRatio)
        ? Math.max(0, Math.min(1, input.warnThresholdRatio))
        : DEFAULT_WARN_THRESHOLD
    const warnUsd = limitUsd * warn
    if (projectedUsd >= limitUsd) {
      riskLevel = 'over'
      warnTriggered = true
      exceedsLimit = true
    } else if (projectedUsd >= warnUsd) {
      riskLevel = 'warn'
      warnTriggered = true
    } else {
      riskLevel = 'safe'
    }
  }

  return {
    thisMonthUsd,
    projectedUsd,
    limitUsd,
    daysElapsed,
    daysInMonth,
    daysRemaining,
    warnTriggered,
    exceedsLimit,
    riskLevel,
  }
}

/** USD を `'$1.23'` (>=1) / `'$0.123'` (<1) / `'$0.00'` (=0) 形式に整形。 */
function formatUsd(usd: number): string {
  const safe = Number.isFinite(usd) ? Math.max(0, usd) : 0
  const decimals = safe < 1 ? 3 : 2
  return `$${safe.toFixed(decimals)}`
}

/**
 * AI 朝 brief / chip 表示用に projection を 1 行 ja-JP 文言で。
 *  - idle → 'AI コスト予測: 不明 (today 不正)'
 *  - 制限なし → '今月予測 $1.20 (現在 $0.40 / 残 22 日)'
 *  - safe → '今月予測 $1.20 / 上限 $5.00 (現在 $0.40 / 残 22 日)'
 *  - warn → '⚠ 今月予測 $4.30 / 上限 $5.00 — 80% 超過見込み (現在 $1.40 / 残 22 日)'
 *  - over → '🚨 今月予測 $5.50 / 上限 $5.00 — 月末超過見込み (現在 $1.80 / 残 22 日)'
 */
/**
 * iter482 ai-automation (graphical 波及): riskLevel を「graphical chip tone」 token に
 * 変換する pure helper。iter481 `dueProximityTone` と同じ 5 段階 vocabulary
 * (danger / urgent / warn / info / idle) のうち 4 種を使用。AI コスト dashboard
 * widget / Slack 通知 ペイロードで「赤=超過 / 橙=警告 / 青=安全 / 灰=不明」を
 * 1 関数で揃える。
 *
 * 配色 token:
 *  - 'danger' — over (rose、月末超過見込み)
 *  - 'warn'   — warn (amber、警告ライン超過見込み)
 *  - 'info'   — safe (blue、制限内、計画通り)
 *  - 'idle'   — idle (slate、today 不正 = 計算不能)
 *
 * iter481 で定義した 5 段階のうち 'urgent' は使わない (= cost projection には
 * 「行動喚起の最強」はない、warn の上は直接 over)。
 */
export type CostMonthProjectionTone = 'danger' | 'warn' | 'info' | 'idle'

const RISK_TONE_MAP: Record<CostMonthProjectionRisk, CostMonthProjectionTone> = {
  over: 'danger',
  warn: 'warn',
  safe: 'info',
  idle: 'idle',
}

export function costMonthProjectionTone(risk: CostMonthProjectionRisk): CostMonthProjectionTone {
  return RISK_TONE_MAP[risk]
}

export interface CostMonthProjectionChipClasses {
  bgClass: string
  textClass: string
  ringClass: string
}

const TONE_CLASSES: Record<CostMonthProjectionTone, CostMonthProjectionChipClasses> = {
  danger: {
    bgClass: 'bg-rose-100',
    textClass: 'text-rose-700',
    ringClass: 'ring-rose-300',
  },
  warn: {
    bgClass: 'bg-amber-100',
    textClass: 'text-amber-800',
    ringClass: 'ring-amber-300',
  },
  info: {
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-700',
    ringClass: 'ring-blue-200',
  },
  idle: {
    bgClass: 'bg-slate-50',
    textClass: 'text-slate-600',
    ringClass: 'ring-slate-200',
  },
}

/** Tone → Tailwind chip class 3 軸 (bg / text / ring) を 1 関数で。iter481 dueProximityChipClasses と整合。 */
export function costMonthProjectionChipClasses(
  risk: CostMonthProjectionRisk,
): CostMonthProjectionChipClasses {
  return TONE_CLASSES[RISK_TONE_MAP[risk]]
}

export function formatCostMonthProjectionJa(p: CostMonthProjection): string {
  if (p.riskLevel === 'idle') return 'AI コスト予測: 不明 (today 不正)'
  const cur = formatUsd(p.thisMonthUsd)
  const proj = formatUsd(p.projectedUsd)
  const tail = `(現在 ${cur} / 残 ${p.daysRemaining} 日)`
  if (p.limitUsd == null) {
    return `今月予測 ${proj} ${tail}`
  }
  const lim = formatUsd(p.limitUsd)
  if (p.riskLevel === 'over') {
    return `🚨 今月予測 ${proj} / 上限 ${lim} — 月末超過見込み ${tail}`
  }
  if (p.riskLevel === 'warn') {
    return `⚠ 今月予測 ${proj} / 上限 ${lim} — 警告ライン超過見込み ${tail}`
  }
  return `今月予測 ${proj} / 上限 ${lim} ${tail}`
}
