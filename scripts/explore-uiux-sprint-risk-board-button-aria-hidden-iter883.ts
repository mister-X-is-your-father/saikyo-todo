/**
 * Phase 6.15 loop iter883 — sprint-risk-board-widget の button case で inner JSX を
 * aria-hidden で wrap した regression guard。outer button aria-label に title +
 * riskScore + 理由件数を完全表現するため、内側 visible 重複を SR で抑制。div case
 * は inner を露出 (visible が accessible name 経路)。
 *
 *   pnpm tsx scripts/explore-uiux-sprint-risk-board-button-aria-hidden-iter883.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

const FILE = 'src/components/sprint/sprint-risk-board-widget.tsx'

function main(): void {
  const findings: Finding[] = []
  const src = readFileSync(resolve(process.cwd(), FILE), 'utf8')

  if (!/<span className="contents" aria-hidden="true">[\s\S]{0,200}\{inner\}/.test(src)) {
    findings.push({
      level: 'error',
      message:
        'button 内 inner を <span className="contents" aria-hidden="true"> で wrap していない',
    })
  }

  // 非 button case (div) では inner を露出 (aria-hidden なし)
  if (!/<div className="flex items-center gap-2 px-1 py-1">\{inner\}<\/div>/.test(src)) {
    findings.push({ level: 'error', message: 'div case (非 button) の inner 露出が壊れた' })
  }

  // aria-label invariant
  if (!src.includes('` を開く (risk score `') && !src.includes('を開く (risk score ${')) {
    findings.push({ level: 'error', message: 'button aria-label invariant 不一致' })
  }

  console.log(`\n=== Findings (sprint-risk-board-button-aria-hidden iter883) ===`)
  if (findings.length === 0) console.log('(なし) 期待どおり全 invariant OK (static grep verify)')
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  process.exit(findings.some((f) => f.level === 'error') ? 1 : 0)
}

main()
