/**
 * Phase 6.15 loop iter 860 (mode-D Desktop a11y) —
 * comment-thread: 5 button visible text を aria-hidden span で wrap (一括)。
 *
 * 課題: src/components/workspace/comment-thread.tsx は item edit dialog 内
 *   コメント tab 全体。5 種 button 全部 aria-label が完全 content を含むのに
 *   visible text は aria-hidden 無し → SR 重複読み上げ:
 *     1. 投稿 button (新規 comment 投稿) — visible "送信中…" / "投稿"
 *     2. 編集 dialog 内 キャンセル button
 *     3. 編集 dialog 内 保存 button
 *     4. 自分の comment row の 編集 button
 *     5. 自分の comment row の 削除 button
 *
 * fix (1 file ~5 spot):
 *   - 各 visible text を <span aria-hidden="true"> で wrap、aria-label 単独経路
 *   - 機能不変、視覚 layout 不変、shadcn 編集なし
 *   - iter800-859 sweep の続編 (comment-thread family、frequently-used UI)
 *
 * 検証: source-side regex assert + iter735/858/859 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ct = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/comment-thread.tsx'),
    'utf8',
  )

  const checks: Array<[string, RegExp]> = [
    ['投稿 button', /<span aria-hidden="true">\{create\.isPending \? '送信中…' : '投稿'\}<\/span>/],
    ['編集 dialog キャンセル', /<span aria-hidden="true">キャンセル<\/span>/],
    ['編集 dialog 保存', /<span aria-hidden="true">保存<\/span>/],
    ['comment-row 編集 button', /<span aria-hidden="true">編集<\/span>/],
    ['comment-row 削除 button', /<span aria-hidden="true">削除<\/span>/],
  ]
  for (const [label, re] of checks) {
    if (re.test(ct)) {
      findings.push({ level: 'info', message: `${label} aria-hidden 統合 OK` })
    } else {
      findings.push({ level: 'warning', message: `${label} aria-hidden 未統合` })
    }
  }

  // aria-label / data-testid 維持
  const attrChecks: Array<[string, RegExp]> = [
    [
      'comment-post aria-label',
      /aria-label=\{[\s\S]+?'コメントを投稿 \(Cmd\/Ctrl\+Enter でも可、@user で言及・通知\)'/,
    ],
    [
      'comment-post aria-keyshortcuts',
      /data-testid="comment-post"[\s\S]+?aria-keyshortcuts="Meta\+Enter Control\+Enter"/,
    ],
    ['comment-edit-cancel aria-label', /aria-label="コメントの編集をキャンセル"/],
    [
      'comment-save aria-label',
      /aria-label=\{[\s\S]+?'コメントの編集を保存 \(Cmd\/Ctrl\+Enter でも可\)'/,
    ],
    [
      'comment-edit aria-label',
      /aria-label=\{`コメント「\$\{comment\.body\.slice\(0, 30\)\}\$\{comment\.body\.length > 30 \? '…' : ''\}」を編集`\}/,
    ],
    [
      'comment-delete aria-label',
      /aria-label=\{[\s\S]+?`コメント「\$\{comment\.body\.slice\(0, 30\)\}\$\{comment\.body\.length > 30 \? '…' : ''\}」を削除`/,
    ],
  ]
  for (const [label, re] of attrChecks) {
    if (re.test(ct)) {
      findings.push({ level: 'info', message: `${label} 維持 OK` })
    } else {
      findings.push({ level: 'warning', message: `${label} 破壊` })
    }
  }

  // iter859 invariant: workflows-panel aria-hidden
  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">作成フォームへ<\/span>/.test(wp)) {
    findings.push({
      level: 'info',
      message: `iter859 invariant: workflows-panel 作成フォームへ aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter859 invariant: 破壊` })
  }

  // iter858 invariant: time-entry aria-hidden
  const cf = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/create-time-entry-form.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{create\.isPending \? '\.\.\.' : '記録'\}<\/span>/.test(cf)) {
    findings.push({
      level: 'info',
      message: `iter858 invariant: create-time-entry-form aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter858 invariant: 破壊` })
  }

  // iter735 invariant: team-context-editor aria-keyshortcuts
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

  console.log(`\n=== Findings (comment-thread-aria-hidden-iter860) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
