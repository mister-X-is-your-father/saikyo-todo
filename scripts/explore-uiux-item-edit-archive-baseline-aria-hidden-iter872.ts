/**
 * Phase 6.15 loop iter 872 (mode-D Desktop a11y) —
 * item-edit-dialog.tsx 4 footer button (アーカイブ復元 / アーカイブ /
 * ベースライン記録-更新 / baseline クリア) 内 visible text を aria-hidden span
 * で wrap (iter800-871 sweep の続編、iter839-840 footer button 完結 sweep)。
 *
 * 課題: item-edit-dialog.tsx 行 799 / 828 / 869-873 / 903 の 4 footer button は
 *   各 aria-label が完全 content を含むのに、内側 visible text は aria-hidden
 *   無し → SR で二重読み可能性。iter839-840 で Save / Cancel / Template 保存
 *   button を fix した続編、残 4 button を一括統一。
 *
 * fix (1 ファイル ~4 行差分): 各 button の visible を aria-hidden span で wrap。
 *
 * 検証: source-side regex assert + iter735/869/870/871 invariant cross-check。
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
  const checks = {
    unarchive:
      /<span aria-hidden="true">\{unarchive\.isPending \? '復元中…' : 'アーカイブ復元'\}<\/span>/.test(
        ied,
      ),
    archive:
      /<span aria-hidden="true">\{archive\.isPending \? 'アーカイブ中…' : 'アーカイブ'\}<\/span>/.test(
        ied,
      ),
    setBaseline: /<span aria-hidden="true">\s*\{setBaseline\.isPending/.test(ied),
    clearBaseline: /<span aria-hidden="true">\s*\{clearBaseline\.isPending/.test(ied),
  }
  const allOk = Object.values(checks).every(Boolean)
  if (allOk) {
    findings.push({
      level: 'info',
      message: `iter872: item-edit-dialog 4 footer button aria-hidden span OK`,
    })
  } else {
    const missing = Object.entries(checks)
      .filter(([, v]) => !v)
      .map(([k]) => k)
      .join(',')
    findings.push({
      level: 'warning',
      message: `iter872: 不完全 (missing: ${missing})`,
    })
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

  console.log(`\n=== Findings (iter872) ===`)
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
