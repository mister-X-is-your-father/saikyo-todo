/**
 * Phase 6.15 loop iter 808 (mode-D Desktop a11y) —
 * notification-bell hint + breakdown chip 内 visible text を aria-hidden span で wrap
 * (iter806/807 同 pattern 拡大)。
 *
 * 課題: notification-bell.tsx 行 164-183 の 2 chip (健全性 hint / 未読内訳) は
 *   parent <span> に aria-label が付いているのに内側 visible text は aria-hidden 無し。
 *   iter800-807 sweep の続編で workspace header の通知 popover でも同 pattern を完成。
 *
 * fix (1 ファイル ~4 行差分、2 chip 各々の visible text を aria-hidden span に wrap):
 *   - hint chip 内 {hint.label} を <span aria-hidden="true"> で wrap
 *   - breakdown chip 内 {unreadBreakdown} を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter735-807 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const nb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/notification-bell.tsx'),
    'utf8',
  )
  const hasHintAriaHidden = /<span aria-hidden="true">\{hint\.label\}<\/span>/.test(nb)
  const hasBreakdownAriaHidden = /<span aria-hidden="true">\{unreadBreakdown\}<\/span>/.test(nb)
  if (hasHintAriaHidden && hasBreakdownAriaHidden) {
    findings.push({
      level: 'info',
      message: `notification-bell hint + breakdown chip aria-hidden span OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `notification-bell chip aria-hidden 不完全 (hint=${hasHintAriaHidden} breakdown=${hasBreakdownAriaHidden})`,
    })
  }

  // iter807 invariant: run + pull status badge aria-hidden
  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`実行ステータス: \$\{label\}`\}\s*\n\s*>\s*\n\s*<span aria-hidden="true">\{label\}<\/span>/.test(
      wp,
    ) &&
    /aria-label=\{`Pull ステータス: \$\{label\}`\}\s*\n\s*>\s*\n\s*<span aria-hidden="true">\{label\}<\/span>/.test(
      ip,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter807 invariant: run + pull status badge aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter807 invariant: 破壊` })
  }

  // iter806 invariant: sprint + goal status Badge aria-hidden
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{sprintStatusLabelJa\(status\)\}<\/span>/.test(sp) &&
    /<span aria-hidden="true">\{goalStatusLabelJa\(status\)\}<\/span>/.test(gp)
  ) {
    findings.push({
      level: 'info',
      message: `iter806 invariant: sprint + goal status Badge aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter806 invariant: 破壊` })
  }

  // iter800 invariant: tag-picker trigger inner aria-hidden
  const tp = readFileSync(resolve(process.cwd(), 'src/components/workspace/tag-picker.tsx'), 'utf8')
  if (
    /<span className="text-muted-foreground" aria-hidden="true">\s*\n?\s*タグなし\s*\n?\s*<\/span>/.test(
      tp,
    ) &&
    /<span className="flex flex-wrap gap-1" aria-hidden="true">/.test(tp)
  ) {
    findings.push({
      level: 'info',
      message: `iter800 invariant: tag-picker trigger inner aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter800 invariant: 破壊` })
  }

  // iter735 invariant: team-context-editor
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

  console.log(`\n=== Findings (notification-bell-chip-aria-hidden-iter808) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
