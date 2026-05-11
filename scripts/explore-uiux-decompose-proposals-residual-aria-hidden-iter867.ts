/**
 * Phase 6.15 loop iter 867 (mode-D Desktop a11y / iter826+ pattern catch-up) —
 * decompose-proposals-panel.tsx の残 4 button visible text を aria-hidden span に統合。
 *
 * 課題: 既に「全て採用 / 全て却下 / やり直し / ✓ 採用」 4 件は span 化済 (iter842 系) だが、
 *   他に visible aria-hidden 抜け 4 件残存:
 *   1. 中止 (Agent cancel、icon + 「中止」)
 *   2. 追加分解 / 再分解 (条件付き、RotateCw + visible)
 *   3. キャンセル (proposal 編集 cancel)
 *   4. 保存 / 保存中… (proposal 編集 save 条件付き)
 *   全 aria-label 完全 content (proposal title + 操作) 包含だが visible に aria-hidden 無し。
 *
 * fix (1 ファイル 4 箇所差分):
 *   - 4 visible text を <span aria-hidden="true"> で wrap (うち 2 件は条件付き式)
 *
 * 検証: source-side regex assert + iter866/865/864/851 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const dpp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )

  const checks: Array<[RegExp, string]> = [
    [/<span aria-hidden="true">中止<\/span>/, '中止 (Agent cancel)'],
    [
      /<span aria-hidden="true">\{list\.length > 0 \? '追加分解' : '再分解'\}<\/span>/,
      '追加分解/再分解 (条件付き)',
    ],
    [/<span aria-hidden="true">キャンセル<\/span>/, 'キャンセル (proposal 編集)'],
    [
      /<span aria-hidden="true">\{update\.isPending \? '保存中…' : '保存'\}<\/span>/,
      '保存 (proposal 編集、条件付き)',
    ],
  ]

  for (const [re, label] of checks) {
    if (re.test(dpp)) {
      findings.push({
        level: 'info',
        message: `decompose-proposals-panel "${label}" aria-hidden 統合 OK`,
      })
    } else {
      findings.push({
        level: 'warning',
        message: `decompose-proposals-panel "${label}" 未統合`,
      })
    }
  }

  // 既存 invariant: iter842 系 (全て採用 / 全て却下 / やり直し / ✓ 採用)
  const existing = [
    /<span aria-hidden="true">全て採用<\/span>/,
    /<span aria-hidden="true">全て却下<\/span>/,
    /<span aria-hidden="true">やり直し<\/span>/,
    /<span aria-hidden="true">✓ 採用<\/span>/,
  ]
  if (existing.every((r) => r.test(dpp))) {
    findings.push({
      level: 'info',
      message: `iter842 系 invariant: decompose-proposals-panel 既存 4 件 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter842 系 invariant: 破壊` })
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

  console.log(`\n=== Findings (decompose-proposals-residual-aria-hidden-iter867) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
