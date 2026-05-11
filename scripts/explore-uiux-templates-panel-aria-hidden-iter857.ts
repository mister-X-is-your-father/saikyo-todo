/**
 * Phase 6.15 loop iter 857 (mode-D Desktop a11y) —
 * templates-panel 「作成フォームへ」 (empty state) + 「作成」 (submit) button:
 * WCAG 2.5.3 (Label in Name) 違反を修正 + iter844-856 pattern 統一。
 *
 * 課題:
 *  1. 「作成フォームへ」 button (templates-empty-create) は visible "作成フォームへ"
 *     を持つが aria-label "Template 作成フォームの『名前』入力欄にフォーカス" は
 *     visible "作成フォームへ" の helper "へ" 1 char を含まず strict substring
 *     **にならない** (= name に visible 含まれず WCAG 2.5.3 失敗、voice control
 *     「作成フォームへ」 発話で name 一致せず)。
 *  2. 「作成」 submit button は visible "作成" が aria-label "Template を新規
 *     作成 (Cmd/Ctrl+Enter でも可)" の strict substring (= "作成" は "新規
 *     作成" 内の 2 文字) を満たすが、iter844-856 同 pattern で aria-hidden
 *     wrap 統一。
 *
 * fix (1 ファイル ~2 行差分):
 *   - 両 button の visible を <span aria-hidden="true"> で wrap、aria-label
 *     単独経路に統一 (iter844-856 同 pattern)。
 *   - aria-label の文脈 (Cmd/Ctrl+Enter shortcut hint / 名前欄フォーカス説明)
 *     維持。
 *   - submit button visible は元の "作成" のみ (pending 中も visible は変えず
 *     disabled で表現するという既存 UX を維持、勝手に "作成中…" 等に変えない)。
 *
 * 検証: source-side regex assert + iter735-856 invariant cross-check。
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

  // 1. 「作成フォームへ」 button visible は aria-hidden span で wrap
  if (/<span aria-hidden="true">作成フォームへ<\/span>/.test(tp)) {
    findings.push({
      level: 'info',
      message: `templates-empty-create visible aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `templates-empty-create visible aria-hidden 未統合`,
    })
  }

  // 2. 「作成」 submit button visible は aria-hidden span で wrap
  if (/<span aria-hidden="true">作成<\/span>/.test(tp)) {
    findings.push({
      level: 'info',
      message: `templates create submit visible aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `templates create submit visible aria-hidden 未統合`,
    })
  }

  // 3. data-testid 維持
  if (/data-testid="templates-empty-create"/.test(tp)) {
    findings.push({
      level: 'info',
      message: `templates-empty-create testid 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `templates-empty-create testid 破壊` })
  }

  // 4. submit button aria-label に Cmd/Ctrl+Enter hint 維持
  if (/'Template を新規作成 \(Cmd\/Ctrl\+Enter でも可\)'/.test(tp)) {
    findings.push({
      level: 'info',
      message: `templates create submit aria-label (Cmd/Ctrl+Enter hint) 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `templates create submit aria-label 文脈破壊` })
  }

  // 5. empty-create aria-label に「名前 input にフォーカス」説明維持
  if (/aria-label="Template 作成フォームの『名前』入力欄にフォーカス"/.test(tp)) {
    findings.push({
      level: 'info',
      message: `templates-empty-create aria-label (フォーカス挙動説明) 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `templates-empty-create aria-label 文脈破壊` })
  }

  // iter856 invariant: wf-node-preset visible aria-hidden
  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\+ \{preset\.type\}<\/span>/.test(wp)) {
    findings.push({
      level: 'info',
      message: `iter856 invariant: wf-node-preset visible aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter856 invariant 破壊` })
  }

  // iter855 invariant: item-edit unarchive visible aria-hidden
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\s*\{unarchive\.isPending \? '復元中…' : 'アーカイブ復元'\}\s*<\/span>/.test(
      ied,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter855 invariant: unarchive visible aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter855 invariant 破壊` })
  }

  // iter735 invariant: team-context-editor aria-keyshortcuts
  const tce = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  const tceMatches = tce.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tceMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter735 invariant: team-context-editor aria-keyshortcuts 維持 OK (${tceMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant: 破壊` })
  }

  console.log(`\n=== Findings (templates-panel-aria-hidden-iter857) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
