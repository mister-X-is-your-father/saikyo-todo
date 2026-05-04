/**
 * Phase 6.15 loop iter 767 (mode-D Desktop a11y) —
 * tag-picker CommandInput に aria-label を追加。iter766 (command-palette) と同 pattern。
 *
 * 課題: tag-picker.tsx 行 118 の CommandInput は placeholder のみ持ち、aria-label が無い。
 *   iter766 で command-palette 検索 input に aria-label を追加したのと同 pattern を
 *   tag-picker にも展開。filled 状態で SR ユーザは「何の input か」 が分からなくなる。
 *
 * fix (1 ファイル ~5 行差分):
 *   - CommandInput に aria-label="タグを検索 or 新規作成 (...)" 追加
 *
 * 検証: source-side regex assert + iter735-766 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const tp = readFileSync(resolve(process.cwd(), 'src/components/workspace/tag-picker.tsx'), 'utf8')
  if (
    /aria-label="タグを検索 or 新規作成 \(Item に紐付けるラベル、新規 tag は色がランダム生成\)"/.test(
      tp,
    )
  ) {
    findings.push({ level: 'info', message: `tag-picker CommandInput aria-label 追加 OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `tag-picker CommandInput aria-label 追加 不完全`,
    })
  }

  // iter766 invariant: command-palette CommandInput aria-label
  const cp = readFileSync(
    resolve(process.cwd(), 'src/components/shared/command-palette.tsx'),
    'utf8',
  )
  if (/aria-label="コマンドパレット 検索 \(コマンド名 or \? でタスクを fuzzy 検索\)"/.test(cp)) {
    findings.push({
      level: 'info',
      message: `iter766 invariant: command-palette CommandInput aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter766 invariant: 破壊` })
  }

  // iter765 invariant: item-edit-dialog 4 section heading
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

  console.log(`\n=== Findings (tag-picker-input-aria-iter767) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
