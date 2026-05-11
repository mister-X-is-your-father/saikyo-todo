/**
 * Phase 6.15 loop iter 873 (mode-D Desktop a11y / iter826+ pattern catch-up) —
 * backlog-view.tsx の各 row 「編集」 Button visible text を aria-hidden span に統合。
 *
 * 課題: src/components/workspace/backlog-view.tsx の Backlog テーブル row action 列
 *   「編集」 Button (line 185) は visible "編集" を直接 children として出していたが、
 *   aria-label "「${title}」を編集" が完全 content を含むのに aria-hidden 無し → SR 再 announce。
 *   Backlog は item 件数 N の row が並ぶので「編集 編集 編集...」の連続 announce 摩擦が顕著。
 *
 * fix (1 ファイル 1 行差分):
 *   - 「編集」 → <span aria-hidden="true">編集</span>
 *
 * 検証: source-side regex assert + iter872/871/870/851 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const bv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )
  // backlog-view 内 "編集" は 1 件あるはず (row action)
  const editCount = (bv.match(/<span aria-hidden="true">編集<\/span>/g) ?? []).length
  if (editCount === 1) {
    findings.push({
      level: 'info',
      message: `backlog-view "編集" row action button aria-hidden 統合 OK (1 件)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `backlog-view "編集" aria-hidden span 件数 ${editCount} (期待 1)`,
    })
  }

  // iter872 invariant: 3 view EmptyState focus jump
  for (const path of [
    'src/components/workspace/inbox-view.tsx',
    'src/components/workspace/today-view.tsx',
    'src/components/workspace/items-board.tsx',
  ]) {
    const text = readFileSync(resolve(process.cwd(), path), 'utf8')
    if (/<span aria-hidden="true">クイック追加にフォーカス \(キー: q\)<\/span>/.test(text)) {
      findings.push({
        level: 'info',
        message: `iter872 invariant: ${path.split('/').pop()} クイック追加 focus jump 維持 OK`,
      })
    } else {
      findings.push({
        level: 'warning',
        message: `iter872 invariant: ${path.split('/').pop()} 破壊`,
      })
    }
  }

  // iter871 invariant
  const bp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/budget-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">上限を変更<\/span>/.test(bp)) {
    findings.push({
      level: 'info',
      message: `iter871 invariant: budget-panel 上限を変更 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter871 invariant: 破壊` })
  }

  // iter851 invariant
  const layout = readFileSync(resolve(process.cwd(), 'src/app/layout.tsx'), 'utf8')
  if (
    /focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:inline-flex focus:min-h-11/.test(
      layout,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter851 invariant: skip-link focus min-h-11 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter851 invariant: 破壊` })
  }

  console.log(`\n=== Findings (backlog-edit-button-aria-hidden-iter873) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
