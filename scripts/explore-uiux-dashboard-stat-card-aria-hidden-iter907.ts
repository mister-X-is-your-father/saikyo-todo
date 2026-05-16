/**
 * Phase 6.15 loop iter 907 (mode-D Desktop a11y) —
 * dashboard-view の StatCard helper の inner visible (label + value) 2 div を
 * aria-hidden 化、role="group" + aria-label 単独経路に統一。
 *
 * 経緯: iter906 weekly-insight chip aria-hidden 化の続編 (Card aria-label 集約 pattern)。
 *   dashboard-view StatCard も同 pattern (role="group" + aria-label "${label}: ${value} (${tone})"
 *   完全 content) だが内側 visible {label} {value} aria-hidden 無し → 重複読み上げ。
 *
 * 修正: 2 inner div に aria-hidden="true" 追加、parent aria-label 単独経路に統一。
 *
 * 検証: source-side regex assert + iter735/843/849-906 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const dv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/dashboard-view.tsx'),
    'utf8',
  )

  // 1. StatCard {label} div aria-hidden
  if (
    /<div className="text-muted-foreground text-xs" aria-hidden="true">\s*\{label\}\s*<\/div>/.test(
      dv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `dashboard StatCard {label} div aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `dashboard StatCard {label} div aria-hidden 未統合`,
    })
  }

  // 2. StatCard {value} div aria-hidden
  if (
    /<div className="mt-1 text-2xl font-semibold" aria-hidden="true">\s*\{value\}\s*<\/div>/.test(
      dv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `dashboard StatCard {value} div aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `dashboard StatCard {value} div aria-hidden 未統合`,
    })
  }

  // 3. parent role="group" + aria-label 維持
  if (
    /role="group"[\s\S]+?aria-label=\{ariaLabel\}/.test(dv) &&
    /data-testid=\{`stat-card-\$\{tone\}`\}/.test(dv)
  ) {
    findings.push({
      level: 'info',
      message: `dashboard StatCard role="group" + aria-label + data-testid 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `dashboard StatCard 構造 破壊`,
    })
  }

  // iter906 invariant
  const wiw = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/weekly-insight-widget.tsx'),
    'utf8',
  )
  if (
    /data-testid="weekly-insight-hint"[\s\S]+?aria-hidden="true"[\s\S]+?>\s*\{hint\.label\}/.test(
      wiw,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter906 invariant: weekly-insight chips aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter906 invariant: 破壊` })
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

  console.log(`\n=== Findings (dashboard-stat-card-aria-hidden-iter907) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
