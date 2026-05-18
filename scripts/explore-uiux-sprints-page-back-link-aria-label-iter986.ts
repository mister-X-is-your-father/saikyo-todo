/**
 * Phase 6.15 loop iter 986 — sprints/page.tsx の Workspace 戻り Link に
 * aria-label="Workspace dashboard に戻る" を付与、visible "← Workspace" 全体を
 * aria-hidden span で wrap。iter918-940 sweep pattern (aria-label + 内側 visible
 * aria-hidden) を workspace 戻り Link にも展開。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const target = 'src/app/(workspace)/[workspaceId]/sprints/page.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  // aria-label="Workspace dashboard に戻る"
  if (!/aria-label="Workspace dashboard に戻る"/.test(src)) {
    findings.push({ level: 'warning', message: `${target}: aria-label 不在` })
  } else {
    findings.push({ level: 'info', message: `back-Link aria-label OK` })
  }
  // visible "← Workspace" が aria-hidden span で wrap
  if (!/<span aria-hidden="true">← Workspace<\/span>/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: visible "← Workspace" が aria-hidden span で wrap されていない`,
    })
  } else {
    findings.push({ level: 'info', message: `visible aria-hidden span wrap OK` })
  }

  // iter977 invariant: main aria-label
  if (!/aria-label="Sprint 計画 → 稼働 → 完了"/.test(src)) {
    findings.push({ level: 'warning', message: `iter977 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter977 invariant OK` })
  }

  console.log(`\n=== Findings (sprints-page-back-link-aria-label-iter986) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.some((f) => f.level !== 'info') ? 1 : 0)
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})
