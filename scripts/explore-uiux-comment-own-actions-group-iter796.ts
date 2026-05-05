/**
 * Phase 6.15 loop iter 796 (mode-D Desktop a11y) —
 * comment-thread 自分のコメント操作 group の aria-label に comment body 抜粋を含めて
 * page-specific 化 (iter795 の編集 actions group 続編、own actions group)。
 *
 * 課題: comment-thread.tsx 行 288 の actions group aria-label="自分のコメント操作
 *   (編集 / 削除)" は静的で、複数 own comment が並ぶ時に SR ユーザは form/group
 *   landmark navigation で「自分のコメント操作」 が複数並び、どの comment の操作
 *   group か区別できなかった。iter795 で edit actions group は dynamic 化済、
 *   own actions group も対称に揃える。
 *
 * fix (1 ファイル ~1 行差分):
 *   - aria-label を `コメント「${body.slice(0,30)}…」の操作 (編集 / 削除、
 *     自分の投稿のみ)` に動的化
 *
 * 検証: source-side regex assert + iter735-795 invariant cross-check。
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
  const hasDynamicLabel =
    /aria-label=\{`コメント「\$\{comment\.body\.slice\(0, 30\)\}\$\{comment\.body\.length > 30 \? '…' : ''\}」の操作 \(編集 \/ 削除、自分の投稿のみ\)`\}/.test(
      ct,
    )
  const oldStaticGone = !ct.includes('aria-label="自分のコメント操作 (編集 / 削除)"')
  if (hasDynamicLabel && oldStaticGone) {
    findings.push({
      level: 'info',
      message: `comment-thread own actions group aria-label dynamic OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `comment-thread own actions group aria-label 不完全 (dynamic=${hasDynamicLabel} oldGone=${oldStaticGone})`,
    })
  }

  // iter795 invariant: comment-thread 編集 actions group aria-label dynamic
  if (
    /aria-label=\{`コメント「\$\{comment\.body\.slice\(0, 30\)\}\$\{comment\.body\.length > 30 \? '…' : ''\}」の編集操作 \(キャンセル \/ 保存\)`\}/.test(
      ct,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter795 invariant: comment-thread 編集 actions group aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter795 invariant: 破壊` })
  }

  // iter794 invariant: kr-add form aria-label dynamic (goal title)
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if (/aria-label=\{`Goal「\$\{goalTitle\}」の Key Result 追加フォーム`\}/.test(gp)) {
    findings.push({
      level: 'info',
      message: `iter794 invariant: kr-add form aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter794 invariant: 破壊` })
  }

  // iter793 invariant: sprint-edit form aria-label dynamic
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (/aria-label=\{`Sprint「\$\{sprint\.name\}」期間編集フォーム`\}/.test(sp)) {
    findings.push({
      level: 'info',
      message: `iter793 invariant: sprint-edit form aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter793 invariant: 破壊` })
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

  console.log(`\n=== Findings (comment-own-actions-group-iter796) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
