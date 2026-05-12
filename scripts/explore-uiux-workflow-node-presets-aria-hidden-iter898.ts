/**
 * Phase 6.15 loop iter 898 (mode-D Desktop a11y) —
 * workflows-panel.tsx node preset button (NODE_PRESETS map) 内 visible
 * "+ {preset.type}" を aria-hidden span で wrap (iter800-897 sweep の続編、
 * Workflow panel button 完結 sweep)。
 *
 * 課題: workflows-panel.tsx 行 515-528 の node preset button (map で生成、複数)
 *   は aria-label "graph に {title} の skeleton node を追加" を持ち title を
 *   完全包含するのに、内側 visible "+ {type}" は aria-hidden 無し → SR で
 *   重複読み上げ可能性。Workflow editor の graph node 追加 preset 群。
 *   iter897 trigger preset と対称化、Workflow editor preset 完結 sweep。
 *
 * fix (1 ファイル ~1 行差分):
 *   - visible "+ {preset.type}" を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter735/895/896/897 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\+ \{preset\.type\}<\/span>/.test(wp)) {
    findings.push({
      level: 'info',
      message: `iter898: workflow node preset button aria-hidden span OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter898: node preset aria-hidden 不在`,
    })
  }

  // iter897 invariant: workflow 4 trigger preset aria-hidden 維持
  const presets = ['manual', 'cron', 'item-event', 'webhook']
  const missing: string[] = []
  for (const preset of presets) {
    const re = new RegExp(`<span aria-hidden="true">${preset}</span>`)
    if (!re.test(wp)) missing.push(preset)
  }
  if (missing.length === 0) {
    findings.push({
      level: 'info',
      message: `iter897 invariant: workflow 4 trigger preset aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter897 invariant: 破壊 (${missing.join(',')})` })
  }

  // iter896 invariant: integrations Pull エラー aria-hidden 維持
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{r\.error\}<\/span>/.test(ip)) {
    findings.push({
      level: 'info',
      message: `iter896 invariant: integrations Pull エラー aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter896 invariant: 破壊` })
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

  console.log(`\n=== Findings (iter898) ===`)
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
