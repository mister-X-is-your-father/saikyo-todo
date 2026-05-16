/**
 * Phase 6.15 loop iter 890 (mode-M Mobile a11y) —
 * 3 form selects (templates-panel kind / goals-panel KR mode / time-entry category)
 * に min-h-11 追加 (mobile tap target 44x44 適合)。
 *
 * 経緯: iter888/889 続編。残 select 群を順次 min-h-11 化。
 *
 * 修正: 3 select に min-h-11 を追加
 *   - templates-panel: tmpl-kind ("h-9 w-full ..." → "min-h-11 w-full ...")
 *   - goals-panel: KR mode select ("rounded border px-2 py-1 text-xs" → "min-h-11 ...")
 *   - create-time-entry-form: teCategory ("h-9 rounded ..." → "min-h-11 ...")
 *
 * 検証: source-side regex assert + iter735/843/849-889 invariant cross-check。
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
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  const cte = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/create-time-entry-form.tsx'),
    'utf8',
  )

  // 1. templates-panel: tmpl-kind min-h-11
  if (
    /<select[\s\S]+?id="tmpl-kind"[\s\S]+?className="min-h-11 w-full rounded-md border px-3 py-1 text-sm"/.test(
      tp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `templates-panel tmpl-kind min-h-11 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `templates-panel tmpl-kind min-h-11 未統合`,
    })
  }

  // 2. goals-panel: KR mode select min-h-11
  if (/<select[\s\S]+?className="min-h-11 rounded border px-2 py-1 text-xs"/.test(gp)) {
    findings.push({
      level: 'info',
      message: `goals-panel KR mode select min-h-11 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `goals-panel KR mode select min-h-11 未統合`,
    })
  }

  // 3. time-entry teCategory min-h-11
  if (
    /<select[\s\S]+?id="teCategory"[\s\S]+?className="min-h-11 rounded border px-2 text-sm"/.test(
      cte,
    )
  ) {
    findings.push({
      level: 'info',
      message: `create-time-entry-form teCategory min-h-11 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `create-time-entry-form teCategory min-h-11 未統合`,
    })
  }

  // iter889 invariant: item-edit-dialog + dep selects min-h-11
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  const idp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-dependencies-panel.tsx'),
    'utf8',
  )
  if (
    (ied.match(/min-h-11 w-full rounded border px-2 py-1\.5 text-sm/g) ?? []).length >= 2 &&
    /min-h-11 rounded border px-2 py-1\.5 text-sm/.test(idp)
  ) {
    findings.push({
      level: 'info',
      message: `iter889 invariant: edit-dialog + deps selects min-h-11 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter889 invariant: 破壊` })
  }

  // shadcn UI 編集なし
  const inputUi = readFileSync(resolve(process.cwd(), 'src/components/ui/input.tsx'), 'utf8')
  if (/h-8/.test(inputUi)) {
    findings.push({
      level: 'info',
      message: `shadcn Input default h-8 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `shadcn Input 編集された` })
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

  console.log(`\n=== Findings (mobile-3-form-selects-h11-iter890) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
