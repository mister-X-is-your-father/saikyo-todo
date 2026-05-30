/**
 * Phase 6.15 loop iter 874 (mode-D Desktop a11y) —
 * template-items-editor + engineer-trigger-button の checkbox label visible text を
 * <span aria-hidden="true"> で wrap し、input aria-label 単独経路に統一。
 *
 * 経緯: iter873 で item-edit-dialog + decompose-proposals MUST checkbox 修正済の続編。
 *   2 file:
 *     - template-items-editor: visible "MUST (絶対落とさない)" を span aria-hidden 化
 *     - engineer-trigger-button: visible "PR 自動起票" span を aria-hidden 化
 *   いずれも input に aria-label 完全 content を持つ。
 *
 * 修正: 2 file 一括で visible label text を span aria-hidden 化、input aria-label 単独経路に統一。
 *
 * 検証: source-side regex assert + iter735/843/849-873 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const tie = readFileSync(
    resolve(process.cwd(), 'src/components/template/template-items-editor.tsx'),
    'utf8',
  )
  const etb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/engineer-trigger-button.tsx'),
    'utf8',
  )

  // 1. template-items-editor visible "MUST (絶対落とさない)" aria-hidden
  if (/<span aria-hidden="true">MUST \(絶対落とさない\)<\/span>/.test(tie)) {
    findings.push({
      level: 'info',
      message: `template-items-editor MUST 絶対落とさない label aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `template-items-editor MUST label aria-hidden 未統合`,
    })
  }

  // 2. template-items-editor input aria-label 完全 content 維持
  if (/isMust[\s\S]+?'MUST が ON: 絶対落とさない — DoD 必須、クリックで OFF'/.test(tie)) {
    findings.push({
      level: 'info',
      message: `template-items-editor MUST input aria-label 完全 content 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `template-items-editor MUST input aria-label 破壊`,
    })
  }

  // 3. engineer-trigger-button visible "PR 自動起票" aria-hidden
  if (
    /<span className="text-muted-foreground" aria-hidden="true">\s*PR 自動起票\s*<\/span>/.test(etb)
  ) {
    findings.push({
      level: 'info',
      message: `engineer-trigger-button "PR 自動起票" label aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `engineer-trigger-button PR 自動起票 label aria-hidden 未統合`,
    })
  }

  // 4. engineer-trigger-button input aria-label 完全 content 維持
  if (
    /autoPr[\s\S]+?'PR 自動起票が ON: Engineer 起動時に Draft PR も作成される — クリックで OFF'/.test(
      etb,
    )
  ) {
    findings.push({
      level: 'info',
      message: `engineer-trigger-button autoPr input aria-label 完全 content 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `engineer-trigger-button autoPr aria-label 破壊`,
    })
  }

  // iter873 invariant
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (
    /<span className="font-medium text-red-700" aria-hidden="true">\s*MUST\s*<\/span>/.test(ied)
  ) {
    findings.push({
      level: 'info',
      message: `iter873 invariant: item-edit-dialog MUST aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter873 invariant: 破壊` })
  }

  // iter872 invariant
  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')
  if (
    /<span aria-hidden="true">依存線<\/span>/.test(gv) &&
    /<span aria-hidden="true">完了済を隠す<\/span>/.test(gv)
  ) {
    findings.push({
      level: 'info',
      message: `iter872 invariant: gantt-view filter labels aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter872 invariant: 破壊` })
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

  console.log(`\n=== Findings (checkbox-label-2-files-aria-hidden-iter874) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
