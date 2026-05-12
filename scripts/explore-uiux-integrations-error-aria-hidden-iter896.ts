/**
 * Phase 6.15 loop iter 896 (mode-D Desktop a11y) —
 * integrations-panel.tsx Pull エラー span 内 visible "{r.error}" を aria-hidden
 * span で wrap (iter800-895 sweep の続編)。
 *
 * 課題: integrations-panel.tsx 行 611-619 の error span (role="alert") は
 *   aria-label "Pull エラー: {error}" を持つのに、内側 visible "{r.error}"
 *   は aria-hidden 無し → SR の role="alert" announce + 内側 text 両方読み上げ
 *   可能性 (alert は割込み読みなので二重 announce が UX 悪い)。
 *   workflows-panel の wf-node-run-error は <pre> で actual content が情報源
 *   (aria-label brief で actual details が pre 内) のため別 pattern として
 *   今回は対象外。
 *
 * fix (1 ファイル ~1 行差分):
 *   - visible "{r.error}" を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter735/893/894/895 invariant cross-check。
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
  if (/<span aria-hidden="true">\{r\.error\}<\/span>/.test(ip)) {
    findings.push({
      level: 'info',
      message: `iter896: integrations Pull エラー span aria-hidden span OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter896: integrations error aria-hidden 不在`,
    })
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

  console.log(`\n=== Findings (iter896) ===`)
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
