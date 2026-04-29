/**
 * Phase 6.15 loop iter 348 — goals-panel の KR 目標値 number input に
 * inputMode="decimal" + step="any"、unit input に autoComplete="off" を追加。
 *
 * 課題: 目標値は decimal (% / hours / 0.5 など) を許容するべきだが inputMode 無で
 *   mobile keyboard が numeric (整数のみ) になり ".", 小数入力時に keypad 切替が
 *   発生。step もデフォルトで "1" のため arrow キー入力で小数化不可。unit input
 *   は app 固有 ("件" / "%" / "ms" 等) で browser autoComplete 候補は無関係。
 *
 * fix: target に `inputMode="decimal" step="any"` (2 行)、unit に `autoComplete="off"`
 *   (1 行) を追加。
 *
 * 機能追加なし、shadcn 編集なし、影響面 1 ファイル。
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
  const target = 'src/components/workspace/goals-panel.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  if (!/inputMode="decimal"/.test(src)) {
    findings.push({ level: 'warning', message: `${target}: inputMode="decimal" 不在` })
  }
  if (!/step="any"/.test(src)) {
    findings.push({ level: 'warning', message: `${target}: step="any" 不在` })
  }
  // unit input の autoComplete="off" (KR 用、新規)
  const unitBlock = src.match(/value=\{unit\}[\s\S]*?\/>/)
  if (!unitBlock || !/autoComplete="off"/.test(unitBlock[0])) {
    findings.push({ level: 'warning', message: `${target}: unit input autoComplete="off" 不在` })
  }

  if (findings.length === 0) {
    findings.push({
      level: 'info',
      message: `${target}: KR target inputMode/step + unit autoComplete OK`,
    })
  }

  console.log(`\n=== Findings (kr-target-inputmode-iter348) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
