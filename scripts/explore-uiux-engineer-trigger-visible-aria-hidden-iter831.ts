/**
 * Phase 6.15 loop iter 831 (mode-D Desktop a11y) —
 * engineer-trigger-button の Submit visible text を aria-hidden span に統合。
 *
 * 課題: engineer-trigger-button.tsx 行 97-103 の Submit button visible text は
 *   "起動中…" / "🛠 Engineer に実装させる" だが、emoji だけ aria-hidden で text 部分が
 *   別 fragment で重複可能性。parent Button に aria-label が完全 content を含む。
 *   iter800-830 sweep の続編。
 *
 * fix (1 ファイル ~5 行差分):
 *   - 全 visible text を 1 つの aria-hidden span に統合 (簡潔化、SR 経路統一)
 *
 * 検証: source-side regex assert + iter735-830 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const etb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/engineer-trigger-button.tsx'),
    'utf8',
  )
  const hasMergedAriaHidden =
    /<span aria-hidden="true">🛠 Engineer に実装させる<\/span>/.test(etb) &&
    /<span aria-hidden="true">起動中…<\/span>/.test(etb)
  if (hasMergedAriaHidden) {
    findings.push({
      level: 'info',
      message: `engineer-trigger-button visible text aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `engineer-trigger-button visible text aria-hidden 不完全`,
    })
  }

  // iter830 invariant: home page workspace Link aria-hidden
  const pg = readFileSync(resolve(process.cwd(), 'src/app/page.tsx'), 'utf8')
  if (/<div className="flex items-center justify-between" aria-hidden="true">/.test(pg)) {
    findings.push({
      level: 'info',
      message: `iter830 invariant: home page workspace Link aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter830 invariant: 破壊` })
  }

  // iter829 invariant: archive Restore button aria-hidden
  const aip = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/archived-items-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{unarchive\.isPending \? '復元中…' : '復元'\}<\/span>/.test(aip)) {
    findings.push({
      level: 'info',
      message: `iter829 invariant: archive Restore button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter829 invariant: 破壊` })
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

  console.log(`\n=== Findings (engineer-trigger-visible-aria-hidden-iter831) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
