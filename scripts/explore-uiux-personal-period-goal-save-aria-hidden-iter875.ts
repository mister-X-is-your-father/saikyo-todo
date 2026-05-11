/**
 * Phase 6.15 loop iter 875 (mode-D Desktop a11y / iter826+ pattern catch-up) —
 * personal-period-view.tsx の ゴール保存 Button visible text を aria-hidden span に統合。
 *
 * 課題: src/components/workspace/personal-period-view.tsx の line 193 「ゴール保存」 Button は
 *   visible {upsertGoal.isPending ? '保存中…' : 'ゴール保存'} を直接 children として出していたが、
 *   aria-label が完全 content ('${period}ゴールに変更がないため保存不要' /
 *   '${period}ゴールを保存中…' / '${period}ゴールを保存') を含むのに aria-hidden 無し → SR 再 announce。
 *   日次 / 週次 / 月次 ゴール保存 path は計画立て直し時の頻繁操作。
 *
 * fix (1 ファイル 1 行差分):
 *   - 条件付き visible を <span aria-hidden="true">…</span> で wrap
 *
 * 検証: source-side regex assert + iter874/873/872/851 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const pp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/personal-period-view.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{upsertGoal\.isPending \? '保存中…' : 'ゴール保存'\}<\/span>/.test(
      pp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `personal-period-view ゴール保存 Button aria-hidden 統合 OK (条件付き)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `personal-period-view ゴール保存 未統合`,
    })
  }

  // iter874 invariant
  const tce = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{upd\.isPending \? '保存中…' : '保存'\}<\/span>/.test(tce)) {
    findings.push({
      level: 'info',
      message: `iter874 invariant: team-context-editor 保存 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter874 invariant: 破壊` })
  }

  // iter873 invariant
  const bv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">編集<\/span>/.test(bv)) {
    findings.push({
      level: 'info',
      message: `iter873 invariant: backlog-view 編集 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter873 invariant: 破壊` })
  }

  // iter851 invariant
  const layout = readFileSync(resolve(process.cwd(), 'src/app/layout.tsx'), 'utf8')
  if (
    /focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:inline-flex focus:min-h-11/.test(
      layout,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter851 invariant: skip-link focus min-h-11 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter851 invariant: 破壊` })
  }

  console.log(`\n=== Findings (personal-period-goal-save-aria-hidden-iter875) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
