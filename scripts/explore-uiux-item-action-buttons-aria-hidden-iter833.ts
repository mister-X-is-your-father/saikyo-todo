/**
 * Phase 6.15 loop iter 833 (mode-D Desktop a11y) —
 * item-decompose-button + item-research-button + item-plan-generate-button の visible
 * text を aria-hidden span で wrap (3 button まとめて、Item action button 群統一性)。
 *
 * 課題: 3 button の visible text は parent Button に aria-label が完全 content を含むのに
 *   aria-hidden 無し。iter800-832 sweep の続編。3 button 一括で同 pattern 適用。
 *
 * fix (3 ファイル ~3 行差分):
 *   - item-decompose-button: visible text を aria-hidden で wrap
 *   - item-research-button: visible text を aria-hidden で wrap
 *   - item-plan-generate-button: visible text を aria-hidden で wrap
 *
 * 検証: source-side regex assert + iter735-832 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const idb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-decompose-button.tsx'),
    'utf8',
  )
  const irb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-research-button.tsx'),
    'utf8',
  )
  const ipgb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-plan-generate-button.tsx'),
    'utf8',
  )
  const hasDecompose =
    /<span aria-hidden="true">\{decompose\.isPending \? '分解中…' : 'AI 分解'\}<\/span>/.test(idb)
  const hasResearch =
    /<span aria-hidden="true">\{research\.isPending \? '調査中…' : 'AI 調査'\}<\/span>/.test(irb)
  const hasPlan =
    /<span aria-hidden="true">\{generate\.isPending \? 'Plan 生成中…' : 'Plan を生成'\}<\/span>/.test(
      ipgb,
    )
  if (hasDecompose && hasResearch && hasPlan) {
    findings.push({
      level: 'info',
      message: `Item action 3 button visible aria-hidden 統一性 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `Item action button aria-hidden 不完全 (decompose=${hasDecompose} research=${hasResearch} plan=${hasPlan})`,
    })
  }

  // iter832 invariant: Goal AI 分解 button visible aria-hidden
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{decompose\.isPending \? 'AI 分解中…' : 'AI 分解'\}<\/span>/.test(gp)
  ) {
    findings.push({
      level: 'info',
      message: `iter832 invariant: Goal AI 分解 button visible aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter832 invariant: 破壊` })
  }

  // iter831 invariant: engineer-trigger visible aria-hidden merge
  const etb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/engineer-trigger-button.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">🛠 Engineer に実装させる<\/span>/.test(etb) &&
    /<span aria-hidden="true">起動中…<\/span>/.test(etb)
  ) {
    findings.push({
      level: 'info',
      message: `iter831 invariant: engineer-trigger visible aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter831 invariant: 破壊` })
  }

  // iter826 invariant: backlog updatedAt time semantic
  const bv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )
  if (/<time dateTime=\{iso\} aria-label=\{`最終更新 \$\{display\}`\}>/.test(bv)) {
    findings.push({
      level: 'info',
      message: `iter826 invariant: backlog updatedAt time semantic 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter826 invariant: 破壊` })
  }

  // iter735 invariant: team-context-editor
  const tce = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  const tceMatches = tce.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tceMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter735 invariant: team-context-editor aria-keyshortcuts 維持 OK (${tceMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant: 破壊` })
  }

  console.log(`\n=== Findings (item-action-buttons-aria-hidden-iter833) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
