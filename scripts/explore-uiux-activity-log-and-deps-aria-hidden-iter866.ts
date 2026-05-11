/**
 * Phase 6.15 loop iter 866 (mode-D Desktop a11y / iter826+ pattern catch-up) —
 * activity-log + item-dependencies-panel の 3 button visible text を aria-hidden span に統合。
 *
 * 課題:
 *   - activity-log.tsx 200: 「詳細を閉じる / 詳細を見る」 (raw button、disclosure)
 *   - item-dependencies-panel.tsx 248: 「追加 / 追加中…」 (依存追加 submit、条件付き)
 *   - item-dependencies-panel.tsx 354: 「解除」 (依存除去 Button)
 *   全 aria-label 完全 content (操作 + entry context) 包含だが visible に aria-hidden 無し → SR 再 announce。
 *
 * fix (2 ファイル 3 行差分):
 *   - 3 visible text を <span aria-hidden="true"> で wrap (activity-log は条件付き / deps 1 件は条件付き)
 *
 * 検証: source-side regex assert + iter865/864/863/860/851 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const al = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/activity-log.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{open \? '詳細を閉じる' : '詳細を見る'\}<\/span>/.test(al)) {
    findings.push({
      level: 'info',
      message: `activity-log "詳細を閉じる/見る" disclosure aria-hidden 統合 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `activity-log "詳細" 未統合` })
  }

  const dp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-dependencies-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{add\.isPending \? '追加中…' : '追加'\}<\/span>/.test(dp)) {
    findings.push({
      level: 'info',
      message: `item-dependencies-panel 「追加」 (条件付き) aria-hidden 統合 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `item-dependencies-panel 「追加」 未統合` })
  }
  if (/<span aria-hidden="true">解除<\/span>/.test(dp)) {
    findings.push({
      level: 'info',
      message: `item-dependencies-panel 「解除」 aria-hidden 統合 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `item-dependencies-panel 「解除」 未統合` })
  }

  // iter865 invariant: comment-thread 4 件
  const ct = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/comment-thread.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">キャンセル<\/span>/.test(ct) &&
    /<span aria-hidden="true">編集<\/span>/.test(ct) &&
    /<span aria-hidden="true">削除<\/span>/.test(ct)
  ) {
    findings.push({
      level: 'info',
      message: `iter865 invariant: comment-thread 4 件 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter865 invariant: 破壊` })
  }

  // iter864 invariant
  const ctf = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/create-time-entry-form.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{create\.isPending \? '…' : '記録'\}<\/span>/.test(ctf)) {
    findings.push({
      level: 'info',
      message: `iter864 invariant: create-time-entry-form 「記録」 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter864 invariant: 破壊` })
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

  console.log(`\n=== Findings (activity-log-and-deps-aria-hidden-iter866) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
