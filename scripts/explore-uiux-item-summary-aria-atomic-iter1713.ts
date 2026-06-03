/**
 * Phase 6.15 loop iter 1713 — item-summary-panel 3 chip に aria-atomic="true"
 * (progress / dependency / latest-activity) を付与。
 *
 * 課題: src/components/workspace/item-summary-panel.tsx の 3 chip (progress /
 *   dependency / latest-activity) は role="status" を持つが aria-atomic 未指定。
 *   progress: 子タスク完了で変化、dependency: 前提条件解消で変化、latest-activity:
 *   relative time (= 5 分前 → 10 分前) で時間経過に応じ変化。partial announce
 *   で context 欠落。iter1709-1712 sweep (today / dashboard / forecast / budget)
 *   と同 pattern。
 *
 * fix: 3 chip に explicit `aria-atomic="true"` を 1 line 付与 (各 3-4 line comment)。
 *   1 file 3 line 追加、機能追加なし、shadcn 編集なし。
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

  const target = 'src/components/workspace/item-summary-panel.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  // 1. progress chip に aria-atomic="true"
  const progressBlock = src.match(
    /data-testid="item-summary-progress"[\s\S]{0,200}|role="status"[\s\S]{0,500}data-testid="item-summary-progress"/,
  )
  // Simpler: check aria-atomic count in file (should be >=3)
  const atomicCount = (src.match(/aria-atomic="true"/g) || []).length
  if (atomicCount < 3) {
    findings.push({
      level: 'warning',
      message: `${target}: aria-atomic="true" 出現が ${atomicCount} 回 (期待 >= 3)`,
    })
  } else {
    findings.push({
      level: 'info',
      message: `item-summary-panel aria-atomic 3 件以上 OK (${atomicCount} 件)`,
    })
  }
  if (!progressBlock) {
    // ok, alternative check
  }

  // 2. 全 3 chip に aria-atomic 付与確認 (testid から前 600 chars 内に aria-atomic="true"
  // が存在することを check、chip 構造は jsx open tag が aria-atomic を含み testid で
  // 終わる前提)
  for (const testid of [
    'item-summary-progress',
    'item-summary-dependency',
    'item-summary-latest-activity',
  ]) {
    const idx = src.indexOf(`data-testid="${testid}"`)
    if (idx < 0) {
      findings.push({
        level: 'warning',
        message: `${target}: chip "${testid}" testid が無い`,
      })
      continue
    }
    const before = src.slice(Math.max(0, idx - 600), idx)
    if (!/aria-atomic="true"/.test(before)) {
      findings.push({
        level: 'warning',
        message: `${target}: chip "${testid}" の前 600 chars に aria-atomic="true" が無い`,
      })
    } else {
      findings.push({ level: 'info', message: `chip "${testid}" aria-atomic OK` })
    }
  }

  // 3. iter1712 budget trend chip invariant
  const budget = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/budget-panel.tsx'),
    'utf8',
  )
  const trendBlock = budget.match(/data-testid="budget-cost-trend-chip"[\s\S]{0,800}aria-label=/)
  if (!trendBlock || !/aria-atomic="true"/.test(trendBlock[0])) {
    findings.push({
      level: 'warning',
      message: 'budget-panel.tsx: iter1712 trend chip aria-atomic invariant が壊れた',
    })
  }

  console.log(`\n=== Findings (item-summary-aria-atomic-iter1713) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
