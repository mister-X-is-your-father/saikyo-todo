/**
 * Phase 6.15 loop iter 897 (mode-D Desktop a11y) —
 * workflows-panel.tsx 4 trigger preset button (manual / cron / item-event /
 * webhook) 内 visible を aria-hidden span で wrap (iter800-896 sweep の続編)。
 *
 * 課題: workflows-panel.tsx 行 572 / 586 / 602 / 625 の 4 trigger preset button
 *   は各 aria-label が完全 content (trigger 種別 + 詳細) を含むのに、内側
 *   visible "manual / cron / item-event / webhook" は aria-hidden 無し → SR で
 *   重複読み上げ可能性。Workflow editor の trigger 種別切替 button。
 *
 * fix (1 ファイル ~4 行差分):
 *   - 4 button の visible 各々を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter735/894/895/896 invariant cross-check。
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
  const presets = ['manual', 'cron', 'item-event', 'webhook']
  const missing: string[] = []
  for (const preset of presets) {
    const re = new RegExp(`<span aria-hidden="true">${preset}</span>`)
    if (!re.test(wp)) missing.push(preset)
  }
  if (missing.length === 0) {
    findings.push({
      level: 'info',
      message: `iter897: workflow 4 trigger preset button aria-hidden span OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter897: missing aria-hidden in trigger presets: ${missing.join(', ')}`,
    })
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

  // iter895 invariant: integrations import counts aria-hidden 維持
  if (
    /<span aria-hidden="true">\s*f=\{r\.fetchedCount\} \/ c=\{r\.createdCount\} \/ u=\{r\.updatedCount\}/.test(
      ip,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter895 invariant: integrations import counts aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter895 invariant: 破壊` })
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

  console.log(`\n=== Findings (iter897) ===`)
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
