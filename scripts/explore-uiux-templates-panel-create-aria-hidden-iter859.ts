/**
 * Phase 6.15 loop iter 859 (mode-D Desktop a11y) —
 * templates-panel の Template 作成 form Submit button visible "作成" を
 * <span aria-hidden="true"> で wrap し、aria-label 単独経路に統一。
 *
 * 経緯: iter844-858 sweep の続編。Template 作成 form の Submit button は
 *   aria-label が 3 状態 (no-name / pending / 通常) の完全 content
 *   (「Template を作成するには名前を入力してください」 / 「Template を作成中…」 /
 *    「Template を新規作成 (Cmd/Ctrl+Enter でも可)」) を含むのに visible "作成" は
 *   aria-hidden 無し → SR 二重読み上げ。
 *
 * 修正: visible "作成" を <span aria-hidden="true"> で wrap、aria-label 単独経路に統一。
 *   既存 aria-keyshortcuts="Meta+Enter Control+Enter" / aria-busy / disabled は維持。
 *
 * 検証: source-side regex assert + iter735/843/849-858 invariant cross-check。
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

  // 1. Template create button visible "作成" を span aria-hidden で wrap
  if (/<span aria-hidden="true">作成<\/span>/.test(tp)) {
    findings.push({
      level: 'info',
      message: `templates-panel create-submit visible "作成" aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `templates-panel create-submit visible aria-hidden 未統合`,
    })
  }

  // 2. aria-label 完全 content 維持 (3 状態)
  const labelOk =
    /'Template を作成するには名前を入力してください'/.test(tp) &&
    /'Template を作成中…'/.test(tp) &&
    /'Template を新規作成 \(Cmd\/Ctrl\+Enter でも可\)'/.test(tp)
  if (labelOk) {
    findings.push({
      level: 'info',
      message: `templates-panel create-submit aria-label 3 状態 完全 content 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `templates-panel create-submit aria-label 破壊`,
    })
  }

  // 3. aria-keyshortcuts + aria-busy + form 構造 維持
  if (
    /aria-keyshortcuts="Meta\+Enter Control\+Enter"/.test(tp) &&
    /aria-busy=\{createMut\.isPending \|\| undefined\}/.test(tp) &&
    /aria-label="Template 作成フォーム"/.test(tp)
  ) {
    findings.push({
      level: 'info',
      message: `templates-panel create-submit a11y attrs 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `templates-panel create-submit a11y attrs 破壊`,
    })
  }

  // iter858 invariant: decompose-proposals-panel 残 4 button aria-hidden
  const dpp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">中止<\/span>/.test(dpp) &&
    /<span aria-hidden="true">キャンセル<\/span>/.test(dpp)
  ) {
    findings.push({
      level: 'info',
      message: `iter858 invariant: decompose-proposals-panel 残 button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter858 invariant: 破壊` })
  }

  // iter857 invariant: sprints-panel
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">期間<\/span>/.test(sp) &&
    /<span aria-hidden="true">稼働開始<\/span>/.test(sp)
  ) {
    findings.push({
      level: 'info',
      message: `iter857 invariant: sprints-panel sprint action aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter857 invariant: 破壊` })
  }

  // iter856 invariant: goals-panel
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if (
    (gp.match(/<span aria-hidden="true">アーカイブ<\/span>/g) ?? []).length >= 2 &&
    (gp.match(/<span aria-hidden="true">active に戻す<\/span>/g) ?? []).length >= 2
  ) {
    findings.push({
      level: 'info',
      message: `iter856 invariant: goals-panel aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter856 invariant: 破壊` })
  }

  // iter735 invariant
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

  console.log(`\n=== Findings (templates-panel-create-aria-hidden-iter859) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
