/**
 * Phase 6.15 loop iter 795 (mode-D Desktop a11y) —
 * comment-thread コメント編集 actions group の aria-label に comment body 抜粋を含めて
 * page-specific 化。
 *
 * 課題: comment-thread.tsx 行 247 の actions group aria-label="コメント編集の操作
 *   (キャンセル / 保存)" は静的で、複数 comment の編集モードに同時に入る場合
 *   (rare だが Item dialog 内で SR ユーザが nav して group を聞き比べる時に発生)
 *   どの comment の編集 group か区別できなかった。
 *
 *   既存 line 300 の編集 button aria-label が `コメント「${body.slice(0,30)}…」を編集`
 *   pattern を採用しているので、actions group も同 pattern に揃えるべき。
 *
 * fix (1 ファイル ~1 行差分):
 *   - aria-label を `コメント「${body.slice(0,30)}${>30 ? '…' : ''}」の編集操作
 *     (キャンセル / 保存)` に動的化
 *
 * 検証: source-side regex assert + iter735-794 invariant cross-check。
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
    /aria-label=\{`コメント「\$\{comment\.body\.slice\(0, 30\)\}\$\{comment\.body\.length > 30 \? '…' : ''\}」の編集操作 \(キャンセル \/ 保存\)`\}/.test(
      ct,
    )
  const oldStaticGone = !ct.includes('aria-label="コメント編集の操作 (キャンセル / 保存)"')
  if (hasDynamicLabel && oldStaticGone) {
    findings.push({
      level: 'info',
      message: `comment-thread 編集 actions group aria-label dynamic (body slice) OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `comment-thread 編集 actions group aria-label 不完全 (dynamic=${hasDynamicLabel} oldGone=${oldStaticGone})`,
    })
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

  // iter791 invariant: decompose-proposals DoD aria-label
  const dpp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (/提案 DoD \(MUST 必須、最大 2000 文字、完了条件を具体記述\)/.test(dpp)) {
    findings.push({
      level: 'info',
      message: `iter791 invariant: decompose-proposals DoD aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter791 invariant: 破壊` })
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

  console.log(`\n=== Findings (comment-edit-actions-group-iter795) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
