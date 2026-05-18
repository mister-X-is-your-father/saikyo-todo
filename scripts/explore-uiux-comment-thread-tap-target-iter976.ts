/**
 * Phase 6.15 loop iter 976 (mode-M Mobile) — comment-thread 編集 / 削除 button 2 つに
 * pseudo `before:absolute before:-inset-3 before:content-['']` で tap area 拡張
 * (44x44 ≧、視覚不変)。iter505 ItemCheckbox / iter598 SeverityChip と同 pattern。
 *
 * 課題: comment-thread の 編集 / 削除 button は text-xs (12px) で min-h / min-w なし、
 *   実 tap area は text bounds (おそらく 30x16) で WCAG 2.5.5 (44x44) 未達。Mobile
 *   親指タップ不安定、隣接 2 button (編集 + 削除) の誤タップリスク。視覚 (text-xs +
 *   小さい アクション風 link 表示) を維持するために pseudo 拡張 pattern を選択。
 *
 * fix: comment-thread.tsx の 2 button に
 *   `relative before:absolute before:-inset-3 before:content-[''] disabled:before:hidden`
 *   を追加。各 12px 外側に透明 ::before で tap area を 44x44+ に拡張、視覚は text-xs 不変。
 *   disabled:before:hidden で disabled 時の anchor 消失。+2/-2 行 (1 file, 2 button class 変更)。
 *
 * 機能追加なし、shadcn 編集なし、影響面 1 ファイル。
 *
 * 検証: source-side regex で codify。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const target = 'src/components/workspace/comment-thread.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  // 1. 編集 button に before:-inset-3
  const editCtx = src.slice(
    src.indexOf('data-testid={`comment-edit-${comment.id}`}') - 1000,
    src.indexOf('data-testid={`comment-edit-${comment.id}`}') + 200,
  )
  if (!/before:-inset-3 before:content-\['']/.test(editCtx)) {
    findings.push({
      level: 'warning',
      message: `${target}: 編集 button に before:-inset-3 不在`,
    })
  } else {
    findings.push({ level: 'info', message: `編集 button before:-inset-3 OK` })
  }

  // 2. 削除 button に before:-inset-3
  const delCtx = src.slice(
    src.indexOf('data-testid={`comment-delete-${comment.id}`}') - 1000,
    src.indexOf('data-testid={`comment-delete-${comment.id}`}') + 200,
  )
  if (!/before:-inset-3 before:content-\['']/.test(delCtx)) {
    findings.push({
      level: 'warning',
      message: `${target}: 削除 button に before:-inset-3 不在`,
    })
  } else {
    findings.push({ level: 'info', message: `削除 button before:-inset-3 OK` })
  }

  // 3. iter505 invariant: item-checkbox の同 pattern
  const itemCheckboxSrc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-checkbox.tsx'),
    'utf8',
  )
  if (!/before:-inset-3 before:rounded-full/.test(itemCheckboxSrc)) {
    findings.push({ level: 'warning', message: `iter505 invariant (item-checkbox) 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter505 invariant OK` })
  }

  // 4. iter975 invariant: sprint-defaults-length enterKeyHint
  const sprintsSrc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  const lenCtx = sprintsSrc.slice(
    sprintsSrc.indexOf('id="sprint-defaults-length"'),
    sprintsSrc.indexOf('id="sprint-defaults-length"') + 1000,
  )
  if (!/enterKeyHint="send"/.test(lenCtx)) {
    findings.push({ level: 'warning', message: `iter975 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter975 invariant OK` })
  }

  // 5. iter735 invariant
  const tce = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  const tceMatches = tce.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tceMatches.length >= 2) {
    findings.push({ level: 'info', message: `iter735 invariant OK (${tceMatches.length} 箇所)` })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant 破壊` })
  }

  console.log(`\n=== Findings (comment-thread-tap-target-iter976) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
