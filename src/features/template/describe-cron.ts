/**
 * iter1415 (queue 目標達成 + 繰り返しタスク substrate): 5-field cron を日本語の
 * 人間可読サマリに整形する pure helper。
 *
 * 設計目的 (FEEDBACK_QUEUE.md 目標達成 + 繰り返し / methodology-modes-plan):
 *   - recurring template の「繰り返し」 タブ / routine 一覧で `schedule_cron` を
 *     生 cron (`0 9 * * 1-5`) でなく「平日 9:00」 と見せる (= 認知負荷低減)。
 *   - cron-parser (次/前 発火計算) とは別軸: 本 helper は **設定内容の説明文** だけ。
 *
 * 対応する canonical pattern (app は 5-field cron、分・時は単一整数前提):
 *   - `0 9 * * *`    → '毎日 9:00'
 *   - `0 9 * * 1-5`  → '平日 9:00'
 *   - `0 9 * * 0,6`  → '週末 9:00'
 *   - `30 9 * * 1`   → '毎週月曜 9:30'
 *   - `0 9 * * 1,3,5`→ '毎週月・水・金 9:00'
 *   - `0 9 1 * *`    → '毎月1日 9:00'
 *   - それ以外       → 'カスタム (<expr>)' (= 安全な fallback、誤訳しない)
 *
 * 副作用無し。pure helper + Vitest 単体で網羅。
 */

const DOW_JA = ['日', '月', '火', '水', '木', '金', '土'] as const

function parseIntField(field: string): number | null {
  if (!/^\d+$/.test(field)) return null
  return Number.parseInt(field, 10)
}

/** dow field を 0-6 の sorted unique 配列に展開。range `a-b` / comma list 対応。解釈不能は null */
function expandDow(field: string): number[] | null {
  const set = new Set<number>()
  for (const token of field.split(',')) {
    const rangeMatch = token.match(/^(\d+)-(\d+)$/)
    if (rangeMatch) {
      const a = Number.parseInt(rangeMatch[1]!, 10)
      const b = Number.parseInt(rangeMatch[2]!, 10)
      if (a > b || a > 7 || b > 7) return null
      for (let d = a; d <= b; d += 1) set.add(d === 7 ? 0 : d)
      continue
    }
    const n = parseIntField(token)
    if (n === null || n > 7) return null
    set.add(n === 7 ? 0 : n) // cron では 0 と 7 が日曜
  }
  return [...set].sort((x, y) => x - y)
}

function formatTime(hour: number, minute: number): string {
  return `${hour}:${String(minute).padStart(2, '0')}`
}

function setEquals(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i])
}

export function describeCronJa(cron: string): string {
  const expr = cron.trim()
  const fallback = `カスタム (${expr})`
  const parts = expr.split(/\s+/)
  if (parts.length !== 5) return fallback

  const [minF, hourF, domF, monthF, dowF] = parts as [string, string, string, string, string]
  const minute = parseIntField(minF)
  const hour = parseIntField(hourF)
  // 分・時が単一整数でない / 月指定ありは誤訳を避け fallback
  if (minute === null || hour === null || minute > 59 || hour > 23 || monthF !== '*') {
    return fallback
  }
  const time = formatTime(hour, minute)

  // 毎月 D 日 (dom 指定 + dow=*)
  if (domF !== '*' && dowF === '*') {
    const dom = parseIntField(domF)
    if (dom === null || dom < 1 || dom > 31) return fallback
    return `毎月${dom}日 ${time}`
  }

  // dom=* の曜日系
  if (domF === '*') {
    if (dowF === '*') return `毎日 ${time}`
    const dows = expandDow(dowF)
    if (dows === null || dows.length === 0) return fallback
    if (setEquals(dows, [1, 2, 3, 4, 5])) return `平日 ${time}`
    if (setEquals(dows, [0, 6])) return `週末 ${time}`
    // 単一曜日は「月曜」、複数は「月・水・金」
    if (dows.length === 1) return `毎週${DOW_JA[dows[0]!]}曜 ${time}`
    const names = dows.map((d) => DOW_JA[d]).join('・')
    return `毎週${names} ${time}`
  }

  // dom と dow 両方指定など複雑系は fallback
  return fallback
}
