/**
 * Phase 6.15 loop iter 879 (mode-D Desktop a11y) —
 * time-entry の 2 button: time-entries-table の sync button + create-time-entry-form の
 * 記録 submit button: visible aria-hidden + create form の visible '...' → '記録中…'
 * 統一 + aria-label を WCAG 2.5.3 適合形に変更。
 *
 * 課題:
 *   (1) src/components/time-entry/time-entries-table.tsx の time-entry-sync (visible '再Sync'
 *       /'Sync') aria-label substring 適合だったが iter844-878 campaign 規約から外れていた。
 *   (2) src/components/time-entry/create-time-entry-form.tsx の create-time-entry-submit
 *       visible '...' (pending) は aria-label '稼働記録を作成中…' (Unicode ellipsis '…') と
 *       完全乖離 (3 dot '...' vs 1 char '…' の Unicode 違い + visible に '稼働' '作成' 含まれず)
 *       → WCAG 2.5.3 違反。
 *
 * fix (2 ファイル / +5-3 行差分、2 button):
 *   - time-entry-sync visible '再Sync'/'Sync' を <span aria-hidden="true"> で wrap
 *   - create-time-entry-submit:
 *     - visible pending '...' → '記録中…' (vocab 統一、Unicode ellipsis 対応)
 *     - aria-label を `記録中… (稼働記録を作成中)` / `記録 (稼働記録を作成)` 形に変更し visible prefix 適合
 *     - visible 全体を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter876-878 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const tt = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/time-entries-table.tsx'),
    'utf8',
  )
  const cf = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/create-time-entry-form.tsx'),
    'utf8',
  )

  // 1. time-entry-sync visible '再Sync'/'Sync' span aria-hidden
  if (
    /<span aria-hidden="true">[\s\S]+?\{e\.syncStatus === 'failed' \? '再Sync' : 'Sync'\}[\s\S]+?<\/span>/.test(
      tt,
    )
  ) {
    findings.push({
      level: 'info',
      message: `time-entry-sync visible '再Sync'/'Sync' span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `time-entry-sync visible '再Sync'/'Sync' aria-hidden 未統合`,
    })
  }

  // 2. create-time-entry-submit 新 aria-label に visible '記録'/'記録中…' prefix
  if (
    /aria-label=\{\s*create\.isPending \? '記録中… \(稼働記録を作成中\)' : '記録 \(稼働記録を作成\)'\s*\}/.test(
      cf,
    )
  ) {
    findings.push({
      level: 'info',
      message: `create-time-entry-submit aria-label に visible prefix 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `create-time-entry-submit aria-label が visible prefix 不含`,
    })
  }

  // 3. create-time-entry-submit visible '記録中…/記録' span aria-hidden
  if (/<span aria-hidden="true">\{create\.isPending \? '記録中…' : '記録'\}<\/span>/.test(cf)) {
    findings.push({
      level: 'info',
      message: `create-time-entry-submit visible '記録中…/記録' span aria-hidden + vocab 統一 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `create-time-entry-submit visible aria-hidden 未統合 or vocab 未統一`,
    })
  }

  // 4. 旧 visible '...' (3 dots) 削除
  if (!/'\.\.\.' : '記録'/.test(cf)) {
    findings.push({
      level: 'info',
      message: `create-time-entry-submit 旧 visible '...' 削除済 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `create-time-entry-submit 旧 visible '...' 残存`,
    })
  }

  // 5. 旧 aria-label '稼働記録を作成中…' 単独形 削除
  if (!/aria-label=\{create\.isPending \? '稼働記録を作成中…' : '稼働記録を作成'\}/.test(cf)) {
    findings.push({
      level: 'info',
      message: `create-time-entry-submit 旧 aria-label 削除済 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `create-time-entry-submit 旧 aria-label 残存`,
    })
  }

  // iter878 invariant: wf-node-preset
  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`\+ \$\{preset\.type\} を追加 \(graph に \$\{preset\.title\} の skeleton node\)`\}/.test(
      wp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter878 invariant: wf-node-preset aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter878 invariant: wf-node-preset 破壊` })
  }

  // iter877 invariant: comment-post
  const ct = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/comment-thread.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{create\.isPending \? '投稿中…' : '投稿'\}<\/span>/.test(ct)) {
    findings.push({
      level: 'info',
      message: `iter877 invariant: comment-post 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter877 invariant: comment-post 破壊` })
  }

  console.log(`\n=== Findings (time-entry-table-form-aria-hidden-iter879) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
