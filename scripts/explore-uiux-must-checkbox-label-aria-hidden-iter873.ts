/**
 * Phase 6.15 loop iter 873 (mode-D Desktop a11y) —
 * item-edit-dialog + decompose-proposals-panel の MUST checkbox surrounding label
 * 内 visible "MUST" + サブラベル span を <span aria-hidden="true"> で wrap し、
 * input aria-label 単独経路に統一。
 *
 * 経緯: iter871/872 で filter checkbox label sweep 済 → MUST checkbox label も
 *   同 pattern。input に aria-label "MUST が ON: 絶対落とさない (DoD 必須、クリックで OFF)" /
 *   「MUST が OFF: 通常タスク (クリックで ON、DoD 必須化)」 完全 content を持つが、
 *   surrounding label 内 visible "MUST" / "(絶対落とさない)" は aria-hidden 無し。
 *
 * 修正: 3 span (item-edit-dialog 2 + decompose-proposals 1) を aria-hidden 化、
 *   input aria-label 単独経路に統一。
 *
 * 検証: source-side regex assert + iter735/843/849-872 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  const dpp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )

  // 1. item-edit-dialog MUST span aria-hidden
  if (
    /<span className="font-medium text-red-700" aria-hidden="true">\s*MUST\s*<\/span>/.test(ied)
  ) {
    findings.push({
      level: 'info',
      message: `item-edit-dialog MUST span aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `item-edit-dialog MUST span aria-hidden 未統合`,
    })
  }

  // 2. item-edit-dialog "(絶対落とさない)" span aria-hidden
  if (
    /<span className="text-muted-foreground text-xs" aria-hidden="true">\s*\(絶対落とさない\)\s*<\/span>/.test(
      ied,
    )
  ) {
    findings.push({
      level: 'info',
      message: `item-edit-dialog "(絶対落とさない)" span aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `item-edit-dialog "(絶対落とさない)" aria-hidden 未統合`,
    })
  }

  // 3. decompose-proposals MUST span aria-hidden
  if (
    /<span className="font-medium text-red-700" aria-hidden="true">\s*MUST\s*<\/span>/.test(dpp)
  ) {
    findings.push({
      level: 'info',
      message: `decompose-proposals-panel MUST span aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `decompose-proposals-panel MUST span aria-hidden 未統合`,
    })
  }

  // 4. input aria-label 完全 content 維持 (両 file)
  if (
    /isMust[\s\S]+?'MUST が ON: 絶対落とさない — DoD 必須、クリックで OFF'/.test(ied) &&
    /isMust[\s\S]+?'MUST が ON: 絶対落とさない — DoD 必須、クリックで OFF'/.test(dpp)
  ) {
    findings.push({
      level: 'info',
      message: `両 file MUST input aria-label 完全 content 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `MUST input aria-label 破壊`,
    })
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

  // iter871 invariant
  const ib = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">MUST のみ<\/span>/.test(ib)) {
    findings.push({
      level: 'info',
      message: `iter871 invariant: items-board MUST のみ label aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter871 invariant: 破壊` })
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

  console.log(`\n=== Findings (must-checkbox-label-aria-hidden-iter873) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
