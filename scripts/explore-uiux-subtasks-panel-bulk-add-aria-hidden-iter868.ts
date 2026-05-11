/**
 * Phase 6.15 loop iter 868 (mode-D Desktop a11y / iter826+ pattern catch-up) —
 * subtasks-panel.tsx の bulk-add Button visible text を aria-hidden span に統合。
 *
 * 課題: src/components/workspace/subtasks-panel.tsx の line 578 子タスク bulk-add
 *   Button は visible {`${pendingTitleCount} 件追加` / '追加中…'} を直接 children として
 *   出していたが、aria-label が完全 content (件数 + 操作) を含むのに aria-hidden 無し
 *   → 一部 SR で children が再 announce される anti-pattern (iter826+ 統一規約に未追従)。
 *   bulk-add は子タスク量産 path で頻繁、SR 文言摩擦をここで除く。
 *
 * fix (1 ファイル 1 行差分):
 *   - 条件付き visible を <span aria-hidden="true">…</span> で wrap (3 行 multiline pattern)
 *
 * 検証: source-side regex assert + iter867/866/865/851 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/subtasks-panel.tsx'),
    'utf8',
  )

  // 1. bulk-add aria-hidden span 統合 (multiline pattern)
  if (
    /<span aria-hidden="true">\s*\{create\.isPending \? '追加中…' : `\$\{pendingTitleCount\} 件追加`\}\s*<\/span>/s.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `subtasks-panel bulk-add Button aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `subtasks-panel bulk-add Button aria-hidden 未統合`,
    })
  }
  // aria-label 維持
  if (/`子タスク \$\{pendingTitleCount\} 件をまとめて追加`/.test(sp)) {
    findings.push({
      level: 'info',
      message: `subtasks-panel bulk-add aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `subtasks-panel bulk-add aria-label 破壊` })
  }

  // iter867 invariant: decompose-proposals-panel 4 件
  const dpp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">中止<\/span>/.test(dpp) &&
    /<span aria-hidden="true">\{list\.length > 0 \? '追加分解' : '再分解'\}<\/span>/.test(dpp)
  ) {
    findings.push({
      level: 'info',
      message: `iter867 invariant: decompose-proposals-panel 中止 + 追加分解/再分解 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter867 invariant: 破壊` })
  }

  // iter866 invariant
  const al = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/activity-log.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{open \? '詳細を閉じる' : '詳細を見る'\}<\/span>/.test(al)) {
    findings.push({
      level: 'info',
      message: `iter866 invariant: activity-log 詳細 disclosure 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter866 invariant: 破壊` })
  }

  // iter865 invariant
  const ct = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/comment-thread.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">編集<\/span>/.test(ct)) {
    findings.push({
      level: 'info',
      message: `iter865 invariant: comment-thread 編集 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter865 invariant: 破壊` })
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

  console.log(`\n=== Findings (subtasks-panel-bulk-add-aria-hidden-iter868) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
