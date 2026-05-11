/**
 * Phase 6.15 loop iter 860 (mode-D Desktop a11y / iter826+ pattern catch-up) —
 * templates-panel.tsx の Template 作成 Button + EmptyState「作成フォームへ」 raw button
 * 2 件 visible text を aria-hidden span に統合。
 *
 * 課題: src/components/template/templates-panel.tsx の 2 button は visible text 直下:
 *   - line 204 「作成」 Button (aria-label "Template を新規作成 (Cmd/Ctrl+Enter でも可)" /
 *     "Template を作成中…" / "Template を作成するには名前を入力してください")
 *   - line 253 raw `<button>` 「作成フォームへ」 (EmptyState focus jump、aria-label
 *     "Template 作成フォームの『名前』入力欄にフォーカス")
 *   どちらも aria-label が完全 content を包含するのに visible に aria-hidden 無し → SR 再 announce。
 *
 * fix (1 ファイル 2 行差分):
 *   - 「作成」 → <span aria-hidden="true">{createMut.isPending ? '作成中…' : '作成'}</span>
 *     (条件付き、aria-label とも整合)
 *   - 「作成フォームへ」 → <span aria-hidden="true">作成フォームへ</span>
 *
 * 検証: source-side regex assert + iter859/858/857/856/855 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const tp = readFileSync(
    resolve(process.cwd(), 'src/components/template/templates-panel.tsx'),
    'utf8',
  )

  if (/<span aria-hidden="true">\{createMut\.isPending \? '作成中…' : '作成'\}<\/span>/.test(tp)) {
    findings.push({
      level: 'info',
      message: `templates-panel "作成" submit button aria-hidden 統合 OK (条件付き)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `templates-panel "作成" submit 未統合`,
    })
  }
  if (/<span aria-hidden="true">作成フォームへ<\/span>/.test(tp)) {
    findings.push({
      level: 'info',
      message: `templates-panel "作成フォームへ" EmptyState button aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `templates-panel "作成フォームへ" EmptyState 未統合`,
    })
  }

  // iter859 invariant: sprints-panel 4 button (period 編集 / defaults / empty)
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  const cancelCount = (sp.match(/<span aria-hidden="true">キャンセル<\/span>/g) ?? []).length
  if (
    /<span aria-hidden="true">作成フォームへ<\/span>/.test(sp) &&
    cancelCount === 2 &&
    /<span aria-hidden="true">編集<\/span>/.test(sp)
  ) {
    findings.push({
      level: 'info',
      message: `iter859 invariant: sprints-panel 4 件 (作成フォームへ / キャンセル x2 / 編集) 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter859 invariant: 破壊` })
  }

  // iter858 invariant: Sprint 操作 7 件
  if (
    /<span aria-hidden="true">期間<\/span>/.test(sp) &&
    /<span aria-hidden="true">中止<\/span>/.test(sp) &&
    /<span aria-hidden="true">\{retroPending \? '振り返り生成中…' : '振り返り生成'\}<\/span>/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter858 invariant: Sprint 操作 7 件 維持 OK (subset)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter858 invariant: 破壊` })
  }

  // iter857 invariant
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

  // iter855 invariant: instantiate-form 展開
  const inst = readFileSync(
    resolve(process.cwd(), 'src/components/template/instantiate-form.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{mut\.isPending \? '展開中…' : '即実行 \(Instantiate\)'\}<\/span>/.test(
      inst,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter855 invariant: instantiate-form 展開中… 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter855 invariant: 破壊` })
  }

  // iter851 invariant: skip-link
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

  console.log(`\n=== Findings (templates-panel-create-and-empty-aria-hidden-iter860) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
