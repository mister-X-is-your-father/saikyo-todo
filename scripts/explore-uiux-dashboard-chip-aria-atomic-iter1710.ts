/**
 * Phase 6.15 loop iter 1710 — DashboardChip (= 全 dashboard chip 約 20 件の共通
 * component) に aria-atomic="true" を付与、ARIA 1.2 implicit 値の browser/SR
 * 実装 inconsistency による partial announce を解消。
 *
 * 課題: src/components/workspace/dashboard-chip.tsx の root <div> は role="status"
 *   / role="alert" + aria-live を持つが aria-atomic は未指定 (= ARIA 1.2 spec の
 *   implicit true に依存)。browser / SR 実装は inconsistent — Chrome/JAWS は
 *   partial announce、Firefox/NVDA は full announce 等 divergent behavior。
 *   chip count 数字 / label 変化時に partial announce で context 欠落 (= 「3」
 *   だけ読み上げて「期限超過 active」 prefix が失われる等)。
 *
 * fix: explicit `aria-atomic="true"` を 1 line 付与。bulk-action-bar bulk-count
 *   (line 86) / today-view chip 2 件 (iter1709) と同 sweep。約 20 dashboard chip
 *   全部に一括適用、partial announce 不整合を 1 source で解消。
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

  const target = 'src/components/workspace/dashboard-chip.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  // 1. dashboard-chip root <div> に aria-atomic="true" 付与
  // role と aria-atomic を含む 1 つの <div ...> ブロックを check
  if (!/role=\{attention \? 'alert' : 'status'\}[\s\S]{0,500}aria-atomic="true"/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: dashboard-chip root に aria-atomic="true" が無い`,
    })
  } else {
    findings.push({ level: 'info', message: 'dashboard-chip aria-atomic="true" OK' })
  }

  // 2. role + aria-live invariant (iter1710 で aria-atomic 追加のみ、他不変)
  if (!/role=\{attention \? 'alert' : 'status'\}/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: role invariant が壊れた`,
    })
  }
  if (!/aria-live=\{attention \? 'assertive' : 'polite'\}/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: aria-live invariant が壊れた`,
    })
  }

  // 3. bulk-action-bar bulk-count reference invariant
  const bulk = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/bulk-action-bar.tsx'),
    'utf8',
  )
  if (!/data-testid="bulk-count"/.test(bulk) || !/aria-atomic="true"/.test(bulk)) {
    findings.push({
      level: 'warning',
      message: 'bulk-action-bar.tsx: bulk-count aria-atomic reference pattern が壊れた',
    })
  }

  // 4. iter1709 today-view chip invariant
  const todayView = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/today-view.tsx'),
    'utf8',
  )
  const streakBlock = todayView.match(/data-testid="today-streak-chip"[\s\S]{0,800}aria-label=/)
  if (!streakBlock || !/aria-atomic="true"/.test(streakBlock[0])) {
    findings.push({
      level: 'warning',
      message: 'today-view.tsx: iter1709 today-streak-chip aria-atomic invariant が壊れた',
    })
  }

  console.log(`\n=== Findings (dashboard-chip-aria-atomic-iter1710) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
