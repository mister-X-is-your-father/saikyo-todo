/**
 * Phase 6.15 loop iter 858 (mode-D Desktop a11y / iter826+ pattern catch-up) —
 * sprints-panel.tsx の Sprint 操作 7 button visible text を aria-hidden span に統合 (一括)。
 *
 * 課題: sprints-panel.tsx の Sprint カード操作群 7 button は全て aria-label が
 *   完全 content (Sprint 名 + 操作) を含むのに visible text に aria-hidden 無し:
 *   1. 期間 (period 編集 enter)
 *   2. 稼働開始 (planning → active)
 *   3. 完了 (active → completed)
 *   4. 計画に戻す (active → planning)
 *   5. 中止 (any → cancelled、confirm 経由)
 *   6. 振り返り生成 / 振り返り生成中… (PM Agent retro)
 *   7. Pre-mortem 生成 / 再生成 / 生成中… (PM Agent pre-mortem)
 *   iter826+ visible aria-hidden 統一規約に未追従、SR 再 announce anti-pattern。
 *
 * fix (1 ファイル 7 箇所差分):
 *   - 5 件は 1 行 wrap (期間 / 稼働開始 / 完了 / 計画に戻す / 中止)
 *   - 2 件は 3 行 wrap (振り返り / Pre-mortem 三項条件)
 *
 * 検証: source-side regex assert + iter857 invariant + iter856/855/854/853/851 cross-check。
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
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )

  const checks: Array<[RegExp, string]> = [
    [/<span aria-hidden="true">期間<\/span>/, '期間'],
    [/<span aria-hidden="true">稼働開始<\/span>/, '稼働開始'],
    [/<span aria-hidden="true">完了<\/span>/, '完了'],
    [/<span aria-hidden="true">計画に戻す<\/span>/, '計画に戻す'],
    [/<span aria-hidden="true">中止<\/span>/, '中止'],
    [
      /<span aria-hidden="true">\{retroPending \? '振り返り生成中…' : '振り返り生成'\}<\/span>/,
      '振り返り生成 (条件付き)',
    ],
    [
      /<span aria-hidden="true">\s*\{premortemPending\s*\?\s*'Pre-mortem 生成中…'\s*:\s*sprint\.premortemGeneratedAt\s*\?\s*'Pre-mortem 再生成'\s*:\s*'Pre-mortem 生成'\}\s*<\/span>/,
      'Pre-mortem 生成 (3 項条件)',
    ],
  ]

  for (const [re, label] of checks) {
    if (re.test(sp)) {
      findings.push({ level: 'info', message: `sprints-panel "${label}" aria-hidden 統合 OK` })
    } else {
      findings.push({ level: 'warning', message: `sprints-panel "${label}" 未統合` })
    }
  }

  // iter857 invariant: goals-panel KR + 作成フォームへ
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">KR 追加<\/span>/.test(gp) &&
    /<span aria-hidden="true">作成フォームへ<\/span>/.test(gp)
  ) {
    findings.push({
      level: 'info',
      message: `iter857 invariant: goals-panel KR + 作成フォームへ 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter857 invariant: 破壊` })
  }

  // iter856 invariant: goals-panel status 5 件
  const status5 =
    (gp.match(/<span aria-hidden="true">完了<\/span>/g) ?? []).length === 1 &&
    (gp.match(/<span aria-hidden="true">アーカイブ<\/span>/g) ?? []).length === 2 &&
    (gp.match(/<span aria-hidden="true">active に戻す<\/span>/g) ?? []).length === 2
  if (status5) {
    findings.push({
      level: 'info',
      message: `iter856 invariant: goals-panel status 5 件 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter856 invariant: 破壊` })
  }

  // iter855 invariant
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{update\.isPending \? '保存中…' : '保存'\}<\/span>/.test(ied)) {
    findings.push({
      level: 'info',
      message: `iter855 invariant: item-edit-dialog 保存中… 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter855 invariant: 破壊` })
  }

  // iter851 invariant: skip-link focus min-h-11
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

  console.log(`\n=== Findings (sprints-panel-ops-aria-hidden-iter858) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
