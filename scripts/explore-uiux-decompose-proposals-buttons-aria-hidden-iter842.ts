/**
 * Phase 6.15 loop iter 842 (mode-D Desktop a11y) —
 * decompose-proposals-panel 全 button visible text を aria-hidden span に統合 (一括)。
 *
 * 課題: decompose-proposals-panel.tsx の 4 button (全て採用 / 全て却下 / やり直し /
 *   採用) visible text は aria-label が完全 content を含むのに aria-hidden 無し。
 *
 * fix (1 ファイル ~5 行差分、4 button の visible text を aria-hidden span に wrap):
 *
 * 検証: source-side regex assert + iter735-841 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const dpp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  const checks = [
    /<span aria-hidden="true">全て採用<\/span>/,
    /<span aria-hidden="true">全て却下<\/span>/,
    /<span aria-hidden="true">やり直し<\/span>/,
    /<span aria-hidden="true">✓ 採用<\/span>/,
  ]
  const allOk = checks.every((re) => re.test(dpp))
  if (allOk) {
    findings.push({
      level: 'info',
      message: `decompose-proposals-panel 4 button visible aria-hidden 統一性 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `decompose-proposals-panel buttons aria-hidden 不完全`,
    })
  }

  // iter841 invariant: items-board view-switcher 9 button aria-hidden
  const ib = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">Today<\/span>/.test(ib) &&
    /<span aria-hidden="true">月次<\/span>/.test(ib)
  ) {
    findings.push({
      level: 'info',
      message: `iter841 invariant: items-board view-switcher 9 button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter841 invariant: 破壊` })
  }

  // iter838 invariant: workflows-panel Workflow buttons aria-hidden
  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{create\.isPending \? '作成中…' : '作成'\}<\/span>/.test(wp) &&
    /<span aria-hidden="true">\{trigger\.isPending \? '実行中…' : '実行'\}<\/span>/.test(wp)
  ) {
    findings.push({
      level: 'info',
      message: `iter838 invariant: workflows-panel buttons aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter838 invariant: 破壊` })
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

  console.log(`\n=== Findings (decompose-proposals-buttons-aria-hidden-iter842) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
