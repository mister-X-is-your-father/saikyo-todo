/**
 * Phase 6.15 loop iter1628: dashboard-view DashboardChip 5 caller (recentDone / velocity /
 * blockedWorkspaceItems / atRiskParents / parentItemsProgress) の ariaLabel colon convention
 * を iter1093-1626 sweep の em-dash 区切に統一。
 *
 * iter1626 で StatCard computation を em-dash 化した「発展」候補をそのまま回収。
 * 各 caller の title 属性は元から `${hintLabel} — ${detail}` 形 (em-dash) で、
 * ariaLabel だけが `: ` colon 形に divergent していた。両 attribute を em-dash に
 * 揃え、SR / mouse-over の読み上げが完全一致するように。
 *
 * 修正 (dashboard-view.tsx):
 *   各 caller の `ariaLabel={\`${...}: ${...}\`}` → `ariaLabel={\`${...} — ${...}\`}`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-dashboard-chip-em-dash-iter1628.ts
 * 前提: なし (source 直読 invariant)
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

interface Finding {
  level: 'error' | 'warning' | 'info'
  source: string
  message: string
}

async function main() {
  const findings: Finding[] = []
  const here = dirname(fileURLToPath(import.meta.url))
  const src = readFileSync(resolve(here, '../src/components/workspace/dashboard-view.tsx'), 'utf8')

  // 1. 旧 colon convention `${X}: ${Y}` が ariaLabel 行に残存していない
  const lines = src.split('\n')
  const oldColonHits = lines.filter((l) => /ariaLabel=\{`\$\{[^`]*\}: \$\{[^`]*\}`\}/.test(l))
  if (oldColonHits.length > 0) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `dashboard-view ariaLabel に旧 colon convention 残存 ${oldColonHits.length} 件: ${oldColonHits[0]?.trim().slice(0, 80)}`,
    })
  }

  // 2. 5 caller (recentDone / velocity / blockedWorkspaceItems / atRiskParents /
  //    parentItemsProgress) で em-dash convention に着地
  const expected = [
    '${recentDone.momentumLabel} — ${recentDone.detail}',
    '${velocity.hintLabel} — ${velocity.detail}',
    '${blockedWorkspaceItems.hintLabel} — ${blockedWorkspaceItems.detail}',
    '${atRiskParents.hintLabel} — ${atRiskParents.detail}',
    '${parentItemsProgress.hintLabel} — ${parentItemsProgress.detail}',
  ]
  for (const e of expected) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `dashboard-view ariaLabel em-dash 未着地: ${e}`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — dashboard-view DashboardChip 5 caller ariaLabel が em-dash convention で統一',
    )
  } else {
    for (const f of findings) console.log(`  [${f.level}/${f.source}] ${f.message}`)
  }
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
