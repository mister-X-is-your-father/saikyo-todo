/**
 * Phase 6.15 loop iter 768 (mode-D Desktop a11y) —
 * assignee-picker CommandInput に aria-label を追加。
 * iter766 (command-palette) / iter767 (tag-picker) 同 pattern の続き。
 *
 * 課題: assignee-picker.tsx 行 114 の CommandInput は placeholder のみ持ち、
 *   aria-label が無い。filled 状態で placeholder は消え、SR ユーザは「何の input か」
 *   が分からなくなる。
 *
 * fix (1 ファイル ~3 行差分):
 *   - CommandInput に aria-label="アサイン候補を検索 (workspace メンバー / AI Agent)" 追加
 *
 * 検証: source-side regex assert + iter735-767 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ap = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/assignee-picker.tsx'),
    'utf8',
  )
  if (/aria-label="アサイン候補を検索 \(workspace メンバー \/ AI Agent\)"/.test(ap)) {
    findings.push({
      level: 'info',
      message: `assignee-picker CommandInput aria-label 追加 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `assignee-picker CommandInput aria-label 追加 不完全`,
    })
  }

  // iter767 invariant: tag-picker CommandInput aria-label
  const tp = readFileSync(resolve(process.cwd(), 'src/components/workspace/tag-picker.tsx'), 'utf8')
  if (
    /aria-label="タグを検索 or 新規作成 \(Item に紐付けるラベル、新規 tag は色がランダム生成\)"/.test(
      tp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter767 invariant: tag-picker CommandInput aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter767 invariant: 破壊` })
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

  console.log(`\n=== Findings (assignee-picker-input-aria-iter768) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
