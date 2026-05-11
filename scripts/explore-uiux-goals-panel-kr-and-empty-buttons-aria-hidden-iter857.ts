/**
 * Phase 6.15 loop iter 857 (mode-D Desktop a11y / iter826+ pattern catch-up) —
 * goals-panel.tsx の KR 追加 Button + Empty state「作成フォームへ」 raw button
 * 2 件 visible text を aria-hidden span に統合。
 *
 * 課題: iter856 で Goal status 遷移 5 button を span 化したが、同 file 内に他にも
 *   visible aria-hidden 抜け 2 件残存していた:
 *   - line 290-302 EmptyState 内 raw `<button>` 「作成フォームへ」 (focus jump button)
 *     aria-label "Goal 作成フォームの『Objective』入力欄にフォーカス" が完全 content
 *   - line 845-862 KR 追加 `<Button>` (Plus icon + 「KR 追加」)
 *     aria-label "Key Result をこの Goal に追加" / "Key Result を追加中…" 完全 content
 *
 * fix (1 ファイル 2 行差分):
 *   - 「作成フォームへ」 → <span aria-hidden="true">…</span>
 *   - 「KR 追加」 → <span aria-hidden="true">…</span>
 *
 * 検証: source-side regex assert + iter856 5 件 invariant + iter855/854/853/851/735 cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )

  // 1. KR 追加 button aria-hidden 統合
  if (/<span aria-hidden="true">KR 追加<\/span>/.test(gp)) {
    findings.push({
      level: 'info',
      message: `goals-panel "KR 追加" Button aria-hidden 統合 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `goals-panel "KR 追加" 未統合` })
  }

  // 2. 作成フォームへ button aria-hidden 統合
  if (/<span aria-hidden="true">作成フォームへ<\/span>/.test(gp)) {
    findings.push({
      level: 'info',
      message: `goals-panel "作成フォームへ" empty state button aria-hidden 統合 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `goals-panel "作成フォームへ" 未統合` })
  }

  // iter856 invariant: status 遷移 5 button 維持
  const status5Counts = {
    完了: (gp.match(/<span aria-hidden="true">完了<\/span>/g) ?? []).length,
    アーカイブ: (gp.match(/<span aria-hidden="true">アーカイブ<\/span>/g) ?? []).length,
    'active に戻す': (gp.match(/<span aria-hidden="true">active に戻す<\/span>/g) ?? []).length,
  }
  if (
    status5Counts['完了'] === 1 &&
    status5Counts['アーカイブ'] === 2 &&
    status5Counts['active に戻す'] === 2
  ) {
    findings.push({
      level: 'info',
      message: `iter856 invariant: status 遷移 5 button (完了 1 / アーカイブ 2 / active 2) 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter856 invariant: status 5 件件数異常 ${JSON.stringify(status5Counts)}`,
    })
  }

  // iter855 invariant: pending state Unicode 統一
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

  // iter854 invariant
  const as = readFileSync(resolve(process.cwd(), 'src/components/shared/async-states.tsx'), 'utf8')
  if (/message\s*=\s*'読み込み中…'/.test(as)) {
    findings.push({
      level: 'info',
      message: `iter854 invariant: async-states default 読み込み中… 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter854 invariant: 破壊` })
  }

  // iter853 invariant
  const rb = readFileSync(resolve(process.cwd(), 'src/app/~offline/retry-button.tsx'), 'utf8')
  if (/<span aria-hidden="true">再読み込みして再試行<\/span>/.test(rb)) {
    findings.push({
      level: 'info',
      message: `iter853 invariant: offline retry button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter853 invariant: 破壊` })
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

  console.log(`\n=== Findings (goals-panel-kr-and-empty-buttons-aria-hidden-iter857) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
