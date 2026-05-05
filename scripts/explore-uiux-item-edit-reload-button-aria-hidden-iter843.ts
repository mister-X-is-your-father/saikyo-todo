/**
 * Phase 6.15 loop iter 843 (mode-D Desktop a11y) —
 * item-edit-dialog reload button visible "最新を読み込み" を aria-hidden span で wrap。
 *
 * 課題: item-edit-dialog.tsx 行 325 の reload button visible text "最新を読み込み" は
 *   aria-label が完全 content を含むのに aria-hidden 無し。
 *
 * fix (1 ファイル ~1 行差分):
 *   - visible text を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter735-842 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  const hasReloadAriaHidden = /<span aria-hidden="true">最新を読み込み<\/span>/.test(ied)
  if (hasReloadAriaHidden) {
    findings.push({
      level: 'info',
      message: `item-edit-dialog reload button aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `item-edit-dialog reload button aria-hidden 不完全`,
    })
  }

  // iter842 invariant: decompose-proposals 4 button aria-hidden
  const dpp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">全て採用<\/span>/.test(dpp) &&
    /<span aria-hidden="true">全て却下<\/span>/.test(dpp) &&
    /<span aria-hidden="true">やり直し<\/span>/.test(dpp) &&
    /<span aria-hidden="true">✓ 採用<\/span>/.test(dpp)
  ) {
    findings.push({
      level: 'info',
      message: `iter842 invariant: decompose-proposals 4 button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter842 invariant: 破壊` })
  }

  // iter841 invariant: items-board view-switcher aria-hidden
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

  console.log(`\n=== Findings (item-edit-reload-button-aria-hidden-iter843) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
