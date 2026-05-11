/**
 * Phase 6.15 loop iter 879 (mode-D Desktop a11y / iter826+ pattern catch-up) —
 * workspace page nav 「← 一覧」 Link visible text を aria-hidden span に統合 (一括 wrap)。
 *
 * 課題: src/app/(workspace)/[workspaceId]/page.tsx の Workspace ヘッダ nav 内
 *   「Workspace 一覧へ戻る」 Link は visible "← " (aria-hidden 済) と "一覧" を分割していた。
 *   "一覧" は aria-hidden 無しで SR が visible 一部のみを再 announce する不安定 pattern。
 *   aria-label 完全 content 包含のため、視覚全体を <span aria-hidden="true"> で統一 wrap し
 *   aria-label 単独経路に統一。
 *
 * fix (1 ファイル 1 行差分):
 *   - <span aria-hidden="true">← </span>一覧 → <span aria-hidden="true">← 一覧</span>
 *
 * 検証: source-side regex assert + iter878/877/876/851 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const wp = readFileSync(
    resolve(process.cwd(), 'src/app/(workspace)/[workspaceId]/page.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">← 一覧<\/span>/.test(wp)) {
    findings.push({
      level: 'info',
      message: `workspace page nav 「← 一覧」 visible aria-hidden 統一 wrap OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `workspace page nav 「← 一覧」 統一 wrap 未統合` })
  }
  // 旧分割 pattern が残っていないこと
  if (/<span aria-hidden="true">← <\/span>一覧/.test(wp)) {
    findings.push({
      level: 'warning',
      message: `workspace page nav 旧分割 pattern 残存`,
    })
  } else {
    findings.push({
      level: 'info',
      message: `workspace page nav 旧分割 pattern 削除 OK`,
    })
  }

  // iter878 invariant
  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')
  if (/<span aria-hidden="true">今日へジャンプ<\/span>/.test(gv)) {
    findings.push({
      level: 'info',
      message: `iter878 invariant: gantt-view 今日へジャンプ 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter878 invariant: 破壊` })
  }

  // iter877 invariant
  const ob = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">昨日 done \{board\.doneYesterday\.count\} 件<\/span>/.test(ob)) {
    findings.push({
      level: 'info',
      message: `iter877 invariant: operation-board-widget 昨日 done 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter877 invariant: 破壊` })
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

  console.log(`\n=== Findings (workspace-page-nav-back-aria-hidden-iter879) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
