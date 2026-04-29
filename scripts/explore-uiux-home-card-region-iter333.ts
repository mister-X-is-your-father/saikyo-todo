/**
 * Phase 6.15 loop iter 333 — HomePage (`/`) の 2 Card に role="region" と
 * CardTitle に heading semantic を batch 付与、iter311/iter323-326 の workspace
 * 内 sweep の HomePage 拡張。
 *
 * 課題: HomePage の "最初の Workspace を作成" / "別の Workspace を作成" の 2
 *   Card は role="region" 不在で SR landmark navigation で skip 不可、CardTitle
 *   も role="heading" 無しで heading navigation でも skip 不可。
 *
 * fix: (1) Card に `role="region" aria-labelledby="<heading-id>"` 付与。
 *      (2) CardTitle に `id="<heading-id>" role="heading" aria-level={2}` 付与。
 *   shadcn 編集禁止ルール内 (props 経由)。
 *
 * 検証: source-side regex assert で codify。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const target = 'src/app/page.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  if (!/<Card role="region" aria-labelledby="first-ws-heading">/.test(src)) {
    findings.push({ level: 'warning', message: `${target}: 最初の Card role="region" 不在` })
  }
  if (!/id="first-ws-heading" role="heading" aria-level=\{2\}/.test(src)) {
    findings.push({ level: 'warning', message: `${target}: 最初の CardTitle heading 不在` })
  }
  if (!/<Card id="new" role="region" aria-labelledby="another-ws-heading">/.test(src)) {
    findings.push({ level: 'warning', message: `${target}: 別の Card role="region" 不在` })
  }
  if (!/id="another-ws-heading"[\s\S]*?role="heading"[\s\S]*?aria-level=\{2\}/.test(src)) {
    findings.push({ level: 'warning', message: `${target}: 別の CardTitle heading 不在` })
  }
  if (findings.length === 0) {
    findings.push({ level: 'info', message: `${target}: HomePage Card heading semantic OK` })
  }

  console.log(`\n=== Findings (home-card-region-iter333) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
