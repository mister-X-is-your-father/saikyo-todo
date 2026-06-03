/**
 * Phase 6.15 loop iter 1712 — budget-panel cost trend chip に aria-atomic="true"
 * を付与 (iter1709-1711 aria-atomic sweep の 4 弾目)。
 *
 * 課題: src/components/workspace/budget-panel.tsx 154 行 cost trend chip は
 *   role="status" + aria-live="polite" を持つが aria-atomic 未指定。trend chip は
 *   ratio / direction が月次で変化、partial announce で context 欠落 (「+3%」
 *   だけ読み上げ「AI コスト傾向」 prefix 失う等)。
 *
 * fix: explicit `aria-atomic="true"` を 1 line 付与 + 5 line comment。
 *   iter1709 (today chip) / iter1710 (dashboard-chip 共通) / iter1711 (forecast)
 *   と sibling convention 整合。
 *
 * 検証: source-side regex assert で codify。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const target = 'src/components/workspace/budget-panel.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  // 1. cost trend chip に aria-atomic="true" 付与
  const block = src.match(
    /data-testid="budget-cost-trend-chip"[\s\S]{0,800}aria-label=\{trendChip\.line\}/,
  )
  if (!block) {
    findings.push({ level: 'warning', message: `${target}: trend chip block 取得失敗` })
  } else if (!/aria-atomic="true"/.test(block[0])) {
    findings.push({
      level: 'warning',
      message: `${target}: trend chip に aria-atomic="true" が無い`,
    })
  } else {
    findings.push({ level: 'info', message: 'budget trend chip aria-atomic="true" OK' })
  }

  // 2. iter1711 forecast chip invariant
  const opBoard = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )
  const forecastBlock = opBoard.match(
    /data-testid="operation-board-forecast"[\s\S]{0,800}aria-label=/,
  )
  if (!forecastBlock || !/aria-atomic="true"/.test(forecastBlock[0])) {
    findings.push({
      level: 'warning',
      message: 'operation-board-widget.tsx: iter1711 forecast chip aria-atomic invariant が壊れた',
    })
  }

  // 3. iter1710 dashboard-chip invariant
  const dashboardChip = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/dashboard-chip.tsx'),
    'utf8',
  )
  if (
    !/role=\{attention \? 'alert' : 'status'\}[\s\S]{0,500}aria-atomic="true"/.test(dashboardChip)
  ) {
    findings.push({
      level: 'warning',
      message: 'dashboard-chip.tsx: iter1710 aria-atomic invariant が壊れた',
    })
  }

  console.log(`\n=== Findings (budget-trend-chip-aria-atomic-iter1712) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
