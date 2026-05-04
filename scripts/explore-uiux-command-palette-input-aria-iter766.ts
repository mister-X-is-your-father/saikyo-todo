/**
 * Phase 6.15 loop iter 766 (mode-D Desktop a11y) —
 * command-palette CommandInput に aria-label を追加。
 *
 * 課題: command-palette.tsx 行 100-104 の CommandInput は placeholder のみ持ち、
 *   aria-label が無い。cmdk の CommandInput は role="combobox" を auto 付与するが、
 *   実際の input element には aria-label が無いと placeholder が SR の dictation
 *   target になる。placeholder は filled 状態では消えるので、SR ユーザは「何を検索する
 *   input か」 が文字入力中に分からなくなる。
 *
 * fix (1 ファイル ~1 行差分):
 *   - CommandInput に `aria-label="コマンドパレット 検索 (コマンド名 or ? でタスクを fuzzy 検索)"` 追加
 *
 * 検証: source-side regex assert + iter735-765 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const cp = readFileSync(
    resolve(process.cwd(), 'src/components/shared/command-palette.tsx'),
    'utf8',
  )
  if (/aria-label="コマンドパレット 検索 \(コマンド名 or \? でタスクを fuzzy 検索\)"/.test(cp)) {
    findings.push({
      level: 'info',
      message: `command-palette CommandInput aria-label 追加 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `command-palette CommandInput aria-label 追加 不完全`,
    })
  }

  // iter765 invariant: item-edit-dialog 4 section header
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  const headingMatches = ied.match(
    /<div className="text-sm font-semibold" role="heading" aria-level=\{3\}>/g,
  )
  if (headingMatches && headingMatches.length >= 4) {
    findings.push({
      level: 'info',
      message: `iter765 invariant: item-edit-dialog 4 section heading 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter765 invariant: 破壊` })
  }

  // iter763 invariant: decompose-proposals status header heading
  const dpp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (
    /<div\s*\n\s*className="flex items-center gap-1\.5 text-sm font-semibold"\s*\n\s*role="heading"\s*\n\s*aria-level=\{3\}\s*\n\s*>/.test(
      dpp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter763 invariant: decompose-proposals status header heading 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter763 invariant: 破壊` })
  }

  // iter752 invariant: backlog-view empty state
  const bv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )
  if (/role="status"\s*\n\s*aria-live="polite"/.test(bv)) {
    findings.push({
      level: 'info',
      message: `iter752 invariant: backlog-view empty state 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter752 invariant: 破壊` })
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

  console.log(`\n=== Findings (command-palette-input-aria-iter766) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
