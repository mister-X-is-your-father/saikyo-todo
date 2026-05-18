/**
 * Phase 6.15 loop iter 946 (mode-M Mobile audit, basics track) —
 * engineer-trigger-button.tsx 内 「PR 自動起票」 checkbox label に min-h-11
 * を付与、隣接 Button (min-h-11 既設) と列高さ統一の codify。
 *
 * 経緯: iter943 で items-board MUST のみ filter checkbox label を min-h-11 化。
 *   同 mode-M sweep 続編として「checkbox + 短文」 form pattern を残箇所 grep し、
 *   engineer-trigger-button が同 pattern (checkbox + 「PR 自動起票」 短文 + 隣接 Button.min-h-11)
 *   で label 全体 height < 44px、列高さ非対称だった。
 *
 * 修正: `<label className="flex items-center gap-1 text-xs">` →
 *   `<label className="flex min-h-11 items-center gap-1 text-xs">`
 *   - native checkbox の click 範囲は label 全体 → label height を 44px に底上げで
 *     mobile tap target 適合
 *   - 隣接 Button.min-h-11 と列高さ統一、視覚整列
 *
 * 経路 B (本 script): className に min-h-11 が含まれること + iter735/942-945 invariant 維持を静的検証。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

function main(): void {
  const findings: Finding[] = []
  const cwd = process.cwd()

  // 1. engineer-trigger-button.tsx checkbox label が min-h-11 を持つこと
  const et = readFileSync(
    resolve(cwd, 'src/components/workspace/engineer-trigger-button.tsx'),
    'utf8',
  )
  if (/<label className="flex min-h-11 items-center gap-1 text-xs">/.test(et)) {
    findings.push({
      level: 'info',
      message: `engineer-trigger-button label min-h-11 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `engineer-trigger-button label min-h-11 欠落`,
    })
  }

  // 2. 隣接 Button min-h-11 が維持されていること
  if (/<Button[^>]*?className="min-h-11"/s.test(et)) {
    findings.push({
      level: 'info',
      message: `engineer-trigger-button 隣接 Button min-h-11 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `engineer-trigger-button 隣接 Button min-h-11 欠落 (regression?)`,
    })
  }

  // 3. iter944 ai-automation invariant: structured-plan speedup ratio 維持
  const sp = readFileSync(resolve(cwd, 'src/features/agent/structured-plan.ts'), 'utf8')
  if (/computePlanSpeedupRatio/.test(sp) && /formatPlanSpeedupRatioJa/.test(sp)) {
    findings.push({
      level: 'info',
      message: `iter944 invariant: structured-plan speedup ratio helper 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter944 invariant: 破壊` })
  }

  // 4. iter943 invariant: items-board MUST filter label min-h-11 維持
  const ib = readFileSync(resolve(cwd, 'src/components/workspace/items-board.tsx'), 'utf8')
  if (/<label htmlFor="filter-must" className="flex min-h-11 items-center gap-1">/.test(ib)) {
    findings.push({
      level: 'info',
      message: `iter943 invariant: items-board MUST filter label min-h-11 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter943 invariant: 破壊` })
  }

  // 5. iter942 ai-automation invariant: operation-board shortBonus 維持
  const ob = readFileSync(resolve(cwd, 'src/features/today/operation-board.ts'), 'utf8')
  if (/extractEstimateMinutes\(it\.description\)/.test(ob) && /shortBonus/.test(ob)) {
    findings.push({
      level: 'info',
      message: `iter942 invariant: operation-board shortBonus 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter942 invariant: 破壊` })
  }

  // 6. iter735 invariant
  const tce = readFileSync(resolve(cwd, 'src/components/workspace/team-context-editor.tsx'), 'utf8')
  const tceMatches = tce.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tceMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter735 invariant: team-context-editor aria-keyshortcuts 維持 OK (${tceMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant: 破壊` })
  }

  console.log(`\n=== Findings (engineer-trigger-checkbox-label-tap-target-iter946) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main()
