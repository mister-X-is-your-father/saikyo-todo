/**
 * Phase 6.15 loop iter 943 (mode-M Mobile audit, basics track) —
 * items-board.tsx 内 MUST のみ filter の checkbox label に min-h-11 を付与し、
 * 隣接 select 2 個 (status / sprint、min-h-11 既設) と mobile tap target を
 * 横に統一する codify。
 *
 * 経緯: iter941 で sprints-panel 期間編集 date input 2 個を min-h-11 化。
 *   同 mode-M sweep の続編として items-board 上部 filter strip を再点検したところ、
 *   <label htmlFor="filter-must" className="flex items-center gap-1"> が
 *   native checkbox (16-20px) + 短文「MUST のみ」 で label 全体 height < 44px、
 *   隣接 status / sprint select は min-h-11 化済 (iter888 / iter906) で非対称だった。
 *
 * 修正: `<label className="flex items-center gap-1">` →
 *   `<label className="flex min-h-11 items-center gap-1">`
 *   - native checkbox の click 範囲は label 全体 → label height を 44px に底上げで
 *     mobile tap target 適合 (= 親指タップで checkbox toggle 確実)
 *   - 視覚 layout は同 strip 内 select 既設 min-h-11 と一致、列高さ統一
 *
 * 経路 B (本 script): className に min-h-11 が含まれること + iter735/941/942 invariant 維持を静的検証。
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

  // 1. items-board.tsx filter-must label が min-h-11 を持つこと
  const ib = readFileSync(resolve(cwd, 'src/components/workspace/items-board.tsx'), 'utf8')
  if (/<label htmlFor="filter-must" className="flex min-h-11 items-center gap-1">/.test(ib)) {
    findings.push({
      level: 'info',
      message: `items-board.tsx filter-must label min-h-11 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `items-board.tsx filter-must label min-h-11 欠落`,
    })
  }

  // 2. 隣接 status / sprint select の min-h-11 既設状態は保たれていること (regression check)
  const filterSelectsCount = (
    ib.match(/className="min-h-11 rounded border px-2 py-1 text-sm"/g) ?? []
  ).length
  if (filterSelectsCount >= 2) {
    findings.push({
      level: 'info',
      message: `items-board.tsx filter select min-h-11 維持 OK (${filterSelectsCount} 箇所、期待 ≥ 2)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `items-board.tsx filter select min-h-11 欠落 (${filterSelectsCount}、期待 ≥ 2)`,
    })
  }

  // 3. iter942 invariant: operation-board shortBonus 実装維持
  const ob = readFileSync(resolve(cwd, 'src/features/today/operation-board.ts'), 'utf8')
  if (/extractEstimateMinutes\(it\.description\)/.test(ob) && /shortBonus/.test(ob)) {
    findings.push({
      level: 'info',
      message: `iter942 invariant: operation-board shortBonus 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter942 invariant: 破壊` })
  }

  // 4. iter941 invariant: sprints-panel date input min-h-11 維持
  const sp = readFileSync(resolve(cwd, 'src/components/workspace/sprints-panel.tsx'), 'utf8')
  const sprintMinH11 = (sp.match(/className="min-h-11 text-xs"/g) ?? []).length
  if (sprintMinH11 >= 2) {
    findings.push({
      level: 'info',
      message: `iter941 invariant: sprints-panel date input min-h-11 維持 OK (${sprintMinH11} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter941 invariant: 破壊 (${sprintMinH11}/2)` })
  }

  // 5. iter735 invariant
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

  console.log(`\n=== Findings (items-board-must-filter-label-tap-target-iter943) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main()
