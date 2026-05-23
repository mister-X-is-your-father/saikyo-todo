/**
 * Phase 6.15 loop iter1145: gantt-view jump-today button aria-label visible-prefix regression guard。
 *
 * iter1145 で発見した WCAG 2.5.3 (Label in Name) 違反: 旧 aria-label
 * `'Gantt timeline を今日 (...) の縦線まで横スクロール'` は visible
 * "今日へジャンプ" の "へジャンプ" 部が literal substring に含まれず、
 * Label in Name 違反 + voice control「click 今日へジャンプ」 match 不可。
 * 旧 aria-label 内の "今日" は単独 substring としては存在するが visible 全文
 * "今日へジャンプ" は substring 不一致。
 *
 * 修正 (gantt-view.tsx, button data-testid=gantt-jump-today): visible 冒頭固定
 *   - 新: '今日へジャンプ — Gantt timeline を今日 (...) の縦線まで横スクロール'
 *   - 旧: 'Gantt timeline を今日 (...) の縦線まで横スクロール'
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-gantt-jump-today-visible-prefix-iter1145.ts
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
  const filePath = resolve(here, '../src/components/workspace/gantt-view.tsx')
  const src = readFileSync(filePath, 'utf8')

  // 新 visible-prefix template literal を assert (em-dash + 旧 descriptive 末尾保持)
  if (!src.includes('`今日へジャンプ — Gantt timeline を今日 (${format(new Date(), ')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message:
        'gantt jump-today button aria-label が visible-prefix 形式 "今日へジャンプ — ..." でない',
    })
  }
  // 旧 paren-only (visible 冒頭 prefix 無し) が残存していないか
  if (src.includes('`Gantt timeline を今日 (${format(new Date(), ')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 aria-label "Gantt timeline を今日 (...) " (visible prefix 無し) が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — gantt jump-today button aria-label は visible "今日へジャンプ" 冒頭固定済 (WCAG 2.5.3)',
    )
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
