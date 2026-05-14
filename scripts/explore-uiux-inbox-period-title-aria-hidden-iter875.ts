/**
 * Phase 6.15 loop iter875 — inbox-view + personal-period-view の Item title visible
 * {it.title} を aria-hidden span 化 (inbox は span 自体に aria-hidden、period は button
 * 子 span で wrap) した regression guard。
 *
 *   pnpm tsx scripts/explore-uiux-inbox-period-title-aria-hidden-iter875.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

function main(): void {
  const findings: Finding[] = []

  const iv = readFileSync(resolve(process.cwd(), 'src/components/workspace/inbox-view.tsx'), 'utf8')
  // outer div role="button" + aria-label を持つ → inner title span は aria-hidden="true"
  if (!/data-testid=\{`inbox-title-\$\{it\.id\}`\}[\s\S]{0,80}aria-hidden="true"/.test(iv)) {
    findings.push({ level: 'error', message: 'inbox-view title span aria-hidden が無い' })
  }

  const pv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/personal-period-view.tsx'),
    'utf8',
  )
  if (
    !/data-testid=\{`period-title-\$\{period\}-\$\{it\.id\}`\}[\s\S]{0,80}aria-label=\{`「\$\{it\.title\}」を編集`\}[\s\S]{0,80}<span aria-hidden="true">\{it\.title\}<\/span>/.test(
      pv,
    )
  ) {
    findings.push({
      level: 'error',
      message: 'personal-period-view title button visible wrap が無い',
    })
  }

  console.log(`\n=== Findings (inbox-period-title-aria-hidden iter875) ===`)
  if (findings.length === 0) console.log('(なし) 期待どおり全 invariant OK (static grep verify)')
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  process.exit(findings.some((f) => f.level === 'error') ? 1 : 0)
}

main()
