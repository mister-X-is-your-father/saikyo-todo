/**
 * Phase 6.15 loop iter 875 (mode-D Desktop a11y) —
 * sprints-panel SprintDefaultsEditor 「編集」 button 内 visible "編集" を
 * aria-hidden span で wrap (iter800-874 sweep の続編、iter837 cancel/save の続編)。
 *
 * 課題: sprints-panel.tsx 行 922 の Sprint デフォルト編集 button は aria-label が
 *   完全 content (現在の曜日 + 日数 + 動作) を含むのに、内側 visible "編集" は
 *   aria-hidden 無し → SR で二重読み可能性。SprintDefaultsEditor の唯一 CTA。
 *   iter837 で cancel/save を fix した残 1 button、完結 sweep。
 *
 * fix (1 ファイル ~1 行差分):
 *   - visible "編集" を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter735/872/873/874 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">編集<\/span>/.test(sp)) {
    findings.push({
      level: 'info',
      message: `iter875: sprint-defaults 編集 button aria-hidden span OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter875: sprint-defaults 編集 aria-hidden 不在`,
    })
  }

  // iter874 invariant: budget-panel 3 button aria-hidden 維持
  const bp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/budget-panel.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">上限を変更<\/span>/.test(bp) &&
    /<span aria-hidden="true">キャンセル<\/span>/.test(bp)
  ) {
    findings.push({
      level: 'info',
      message: `iter874 invariant: budget-panel aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter874 invariant: 破壊` })
  }

  // iter873 invariant: decompose-proposals aria-hidden 維持
  const dpp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{list\.length > 0 \? '追加分解' : '再分解'\}<\/span>/.test(dpp)) {
    findings.push({
      level: 'info',
      message: `iter873 invariant: decompose-proposals aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter873 invariant: 破壊` })
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

  console.log(`\n=== Findings (iter875) ===`)
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
