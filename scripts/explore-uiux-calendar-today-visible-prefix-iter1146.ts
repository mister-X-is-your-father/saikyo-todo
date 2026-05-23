/**
 * Phase 6.15 loop iter1146: calendar-view today button aria-label visible-prefix regression guard。
 *
 * iter1146 で発見した visible-prefix 漏れ: calendar-view.tsx data-testid=calendar-today-btn の
 * 旧 aria-label `表示日を今日 (M月d日 (eee)) にリセット` は visible "今日" を中位置 (位置 4) に
 * 持ち voice control prefix-matching「click 今日」 match 不可 (substring としては存在するが
 * iter1093-1145 sweep convention は visible 冒頭固定が原則)。
 *
 * 修正 (calendar-view.tsx): visible 冒頭 + em-dash 区切で descriptive 末尾保持
 *   - 新: `今日 — 表示日を今日 (...) にリセット`
 *   - 旧: `表示日を今日 (...) にリセット`
 *
 * sibling calendar-prev-btn / calendar-next-btn は icon-only (ChevronLeft/Right) で visible text
 * が無いため対象外。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-calendar-today-visible-prefix-iter1146.ts
 * 前提: なし (source 直読 invariant)
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

interface Finding {
  level: 'error' | 'warning' | 'info'
  source: string
  message: string
}

async function main() {
  const findings: Finding[] = []
  const here = dirname(fileURLToPath(import.meta.url))
  const filePath = resolve(here, '../src/components/schedule/calendar-view.tsx')
  const src = readFileSync(filePath, 'utf8')

  // 新 visible-prefix template literal を assert
  if (!src.includes('`今日 — 表示日を今日 (${format(new Date(), ')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'calendar-today-btn aria-label が visible-prefix 形式 "今日 — ..." でない',
    })
  }
  // 旧 prefix-less template literal が残存していないか
  if (src.includes('`表示日を今日 (${format(new Date(), ')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 aria-label "表示日を今日 (...) にリセット" (visible 中位置) が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — calendar-today-btn aria-label は visible "今日" 冒頭固定済')
  } else {
    for (const f of findings) console.log(`  [${f.level}/${f.source}] ${f.message}`)
  }
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
