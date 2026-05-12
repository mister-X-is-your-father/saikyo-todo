/**
 * Phase 6.15 loop iter 895 (mode-D Desktop a11y) —
 * integrations-panel.tsx Pull 履歴 counts chip 内 visible "f=N / c=N / u=N" を
 * aria-hidden span で wrap (iter800-894 sweep の続編)。
 *
 * 課題: integrations-panel.tsx 行 604-608 の counts span は aria-label
 *   "fetched X / created Y / updated Z" を持つのに、内側 visible
 *   "f=X / c=Y / u=Z" (compact 形式) は aria-hidden 無し → SR で重複読み上げ
 *   可能性。Pull 履歴の各 import row の counts chip。
 *
 * fix (1 ファイル ~3 行差分):
 *   - visible "f={N} / c={N} / u={N}" を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter735/892/893/894 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\s*f=\{r\.fetchedCount\} \/ c=\{r\.createdCount\} \/ u=\{r\.updatedCount\}/.test(
      ip,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter895: integrations Pull 履歴 counts chip aria-hidden span OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter895: integrations counts chip aria-hidden 不在`,
    })
  }

  // iter894 invariant: dashboard-must-title aria-hidden 維持
  const dv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/dashboard-view.tsx'),
    'utf8',
  )
  if (
    /data-testid=\{`dashboard-must-title-\$\{item\.id\}`\}[\s\S]*?<span aria-hidden="true">\{item\.title\}<\/span>/.test(
      dv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter894 invariant: dashboard-must-title aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter894 invariant: 破壊` })
  }

  // iter893 invariant: operation-board tactics aria-hidden 維持
  const obw = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )
  if ((obw.match(/<span className="truncate" aria-hidden="true">/g) ?? []).length >= 2) {
    findings.push({
      level: 'info',
      message: `iter893 invariant: operation-board tactics aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter893 invariant: 破壊` })
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

  console.log(`\n=== Findings (iter895) ===`)
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
