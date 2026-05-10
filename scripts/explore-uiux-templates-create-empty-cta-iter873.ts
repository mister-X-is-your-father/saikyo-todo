/**
 * Phase 6.15 loop iter 873 (mode-D Desktop a11y) —
 * templates-panel Template 作成 submit button + 空状態 CTA "作成フォームへ" button:
 * visible text を span aria-hidden で wrap (一括) + 空状態 CTA は WCAG 2.5.3
 * (Label in Name) 違反を修正。
 *
 * 課題: src/components/template/templates-panel.tsx:
 *   - Template 作成 submit (visible "作成") aria-label "Template を新規作成" → 適合だが wrap 漏れ
 *   - templates-empty-create (visible "作成フォームへ") 旧 aria-label "Template 作成フォームの
 *     『名前』入力欄にフォーカス" → visible "作成フォームへ" の `へ` が aria-label `の` に
 *     置換されており substring 不適合 (WCAG 2.5.3 違反)
 *
 * fix (1 ファイル / +2-2 行差分、2 button 一括):
 *   - 作成 submit: <Button>作成</Button> → <Button><span aria-hidden="true">作成</span></Button>
 *   - empty CTA: aria-label を `Template 作成フォームへ移動 (『名前』入力欄にフォーカス)` 形に変更し
 *     visible "作成フォームへ" prefix 適合化、span aria-hidden で wrap
 *
 * 検証: source-side regex assert + iter871-872 invariant cross-check。
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

  // 1. Template 作成 submit visible "作成" span aria-hidden
  if (
    /aria-keyshortcuts="Meta\+Enter Control\+Enter"[\s\S]+?<span aria-hidden="true">作成<\/span>/.test(
      tp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `tmpl-create submit visible "作成" span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `tmpl-create submit visible "作成" aria-hidden 未統合`,
    })
  }

  // 2. templates-empty-create aria-label に "作成フォームへ" prefix
  if (/aria-label="Template 作成フォームへ移動 \(『名前』入力欄にフォーカス\)"/.test(tp)) {
    findings.push({
      level: 'info',
      message: `templates-empty-create aria-label に "作成フォームへ" prefix 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `templates-empty-create aria-label が "作成フォームへ" prefix 不含`,
    })
  }

  // 3. templates-empty-create visible span aria-hidden
  if (/<span aria-hidden="true">作成フォームへ<\/span>/.test(tp)) {
    findings.push({
      level: 'info',
      message: `templates-empty-create visible "作成フォームへ" span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `templates-empty-create visible "作成フォームへ" aria-hidden 未統合`,
    })
  }

  // 4. 旧 aria-label "Template 作成フォームの『名前』入力欄にフォーカス" 削除
  if (!/aria-label="Template 作成フォームの『名前』入力欄にフォーカス"/.test(tp)) {
    findings.push({
      level: 'info',
      message: `templates-empty-create 旧 aria-label 削除済 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `templates-empty-create 旧 aria-label 残存` })
  }

  // 5. data-testid 維持
  if (/data-testid="templates-empty-create"/.test(tp)) {
    findings.push({
      level: 'info',
      message: `templates-empty-create data-testid 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `templates-empty-create data-testid 破壊` })
  }

  // iter872 invariant: src-toggle aria-label
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (
    /`Source「\$\{src\.name\}」を\$\{src\.enabled \? '無効化 \(Pull button \+ cron 自動 import を停止\)' : '有効化 \(Pull button \+ cron 自動 import を再開\)'\}`/.test(
      ip,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter872 invariant: src-toggle aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter872 invariant: src-toggle 破壊` })
  }

  console.log(`\n=== Findings (templates-create-empty-cta-iter873) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
