/**
 * Phase 6.15 loop iter 872 (mode-D Desktop a11y / iter826+ pattern catch-up) —
 * 3 view EmptyState の "クイック追加にフォーカス" focus-jump button visible text を aria-hidden span に統合 (一括)。
 *
 * 課題: 3 view (inbox / today / items-board) の EmptyState focus jump button:
 *   - inbox-view.tsx EmptyState
 *   - today-view.tsx EmptyState
 *   - items-board.tsx (Today/Inbox 以外の view default empty)
 *   全て visible "クイック追加にフォーカス (キー: q)" / aria-label "クイック追加入力欄にフォーカス (q キーでも可)" の組み合わせ。aria-label が完全 content (操作 + キーボード hint) 包含だが visible に aria-hidden 無し → SR 再 announce、empty 状態で q ショートカット導線を頻繁に踏む。
 *
 * fix (3 ファイル各 1 行差分):
 *   - 3 visible text を <span aria-hidden="true"> で wrap (3 view 共通 pattern を一斉統一)
 *
 * 検証: source-side regex assert + iter871/870/869/851 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  for (const path of [
    'src/components/workspace/inbox-view.tsx',
    'src/components/workspace/today-view.tsx',
    'src/components/workspace/items-board.tsx',
  ]) {
    const text = readFileSync(resolve(process.cwd(), path), 'utf8')
    if (/<span aria-hidden="true">クイック追加にフォーカス \(キー: q\)<\/span>/.test(text)) {
      findings.push({
        level: 'info',
        message: `${path.split('/').pop()} クイック追加 focus jump aria-hidden 統合 OK`,
      })
    } else {
      findings.push({
        level: 'warning',
        message: `${path.split('/').pop()} クイック追加 focus jump 未統合`,
      })
    }
  }

  // iter871 invariant
  const bp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/budget-panel.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">上限を変更<\/span>/.test(bp) &&
    /<span aria-hidden="true">\{update\.isPending \? '保存中…' : '保存'\}<\/span>/.test(bp)
  ) {
    findings.push({
      level: 'info',
      message: `iter871 invariant: budget-panel 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter871 invariant: 破壊` })
  }

  // iter870 invariant
  const bab = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/bulk-action-bar.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{s\.label\} に<\/span>/.test(bab) &&
    /<span aria-hidden="true">解除<\/span>/.test(bab)
  ) {
    findings.push({
      level: 'info',
      message: `iter870 invariant: bulk-action-bar 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter870 invariant: 破壊` })
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

  console.log(`\n=== Findings (quick-add-focus-jump-aria-hidden-iter872) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
