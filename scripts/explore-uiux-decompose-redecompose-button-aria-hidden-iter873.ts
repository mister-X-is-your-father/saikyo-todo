/**
 * Phase 6.15 loop iter 873 (mode-D Desktop a11y) —
 * decompose-proposals-panel.tsx 再分解 / 追加分解 button 内 visible を
 * aria-hidden span で wrap (iter800-872 sweep の続編、iter842 で 4 button を
 * fix した残 1 button)。
 *
 * 課題: decompose-proposals-panel.tsx 行 252 の RotateCw button (追加分解 or
 *   再分解) は aria-label が完全 content を含むのに、内側 visible は aria-hidden
 *   無し → SR で二重読み可能性。iter842 で他 4 button (全て採用 / 全て却下 /
 *   やり直し / 編集 form action) を fix した残 1 button、完結 sweep。
 *
 * fix (1 ファイル ~1 行差分):
 *   - visible "{list.length > 0 ? '追加分解' : '再分解'}" を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter735/870/871/872 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const dpp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{list\.length > 0 \? '追加分解' : '再分解'\}<\/span>/.test(dpp)) {
    findings.push({
      level: 'info',
      message: `iter873: decompose-proposals 追加分解/再分解 button aria-hidden span OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter873: decompose 追加分解/再分解 aria-hidden 不在`,
    })
  }

  // iter872 invariant: item-edit-dialog 4 footer button aria-hidden 維持
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{unarchive\.isPending \? '復元中…' : 'アーカイブ復元'\}<\/span>/.test(
      ied,
    ) &&
    /<span aria-hidden="true">\s*\{setBaseline\.isPending/.test(ied)
  ) {
    findings.push({
      level: 'info',
      message: `iter872 invariant: item-edit-dialog 4 footer button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter872 invariant: 破壊` })
  }

  // iter871 invariant: create-time-entry submit aria-hidden 維持
  const cef = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/create-time-entry-form.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{create\.isPending \? '\.\.\.' : '記録'\}<\/span>/.test(cef)) {
    findings.push({
      level: 'info',
      message: `iter871 invariant: create-time-entry submit aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter871 invariant: 破壊` })
  }

  // iter870 invariant: sprint-swimlane summary aria-hidden 維持
  const ssd = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprint-swimlane-disclosure.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">担当者ビュー \(swim-lane Gantt\)<\/span>/.test(ssd)) {
    findings.push({
      level: 'info',
      message: `iter870 invariant: sprint-swimlane summary aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter870 invariant: 破壊` })
  }

  // iter735 invariant: shadcn UI 未編集
  const tabs = readFileSync(resolve(process.cwd(), 'src/components/ui/tabs.tsx'), 'utf8')
  if (!/aria-hidden/.test(tabs)) {
    findings.push({ level: 'info', message: `iter735 invariant: shadcn/tabs.tsx 未編集 OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `iter735 invariant: shadcn tabs.tsx に aria-hidden 編集が混入`,
    })
  }

  console.log(`\n=== Findings (iter873) ===`)
  if (findings.length === 0) console.log('(なし)')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
