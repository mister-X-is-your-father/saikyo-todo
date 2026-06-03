/**
 * Phase 6.15 loop iter 1711 — operation-board-widget の forecast chip に
 * aria-atomic="true" を付与 (iter1709 today chip / iter1710 dashboard chip と同 sweep)。
 *
 * 課題: src/components/workspace/operation-board-widget.tsx 130 行 forecast chip は
 *   role="status" を持つが aria-atomic 未指定 (= ARIA 1.2 implicit true に依存)。
 *   forecast chip は estimate / remaining 値が items / 時刻に応じて変化、partial
 *   announce で context 欠落 (= 「3h」 だけ読み上げ「今日完了予測」 prefix が失われる)。
 *   iter1709 (today chip) / iter1710 (dashboard chip) と同 pattern で sibling と
 *   convention 整合させる。
 *
 * fix: explicit `aria-atomic="true"` を 1 line 付与 + 5 line comment。
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

  const target = 'src/components/workspace/operation-board-widget.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  // 1. forecast chip に aria-atomic="true" 付与
  const block = src.match(
    /data-testid="operation-board-forecast"[\s\S]{0,800}aria-label=\{`今日完了予測 /,
  )
  if (!block) {
    findings.push({
      level: 'warning',
      message: `${target}: forecast chip block 取得失敗`,
    })
  } else if (!/aria-atomic="true"/.test(block[0])) {
    findings.push({
      level: 'warning',
      message: `${target}: forecast chip に aria-atomic="true" が無い`,
    })
  } else {
    findings.push({ level: 'info', message: 'forecast chip aria-atomic="true" OK' })
  }

  // 2. iter1710 dashboard-chip invariant
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

  // 3. iter1709 today chip invariant
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

  console.log(`\n=== Findings (forecast-chip-aria-atomic-iter1711) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
