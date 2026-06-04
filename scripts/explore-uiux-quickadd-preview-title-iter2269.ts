/**
 * Phase 6.15 loop iter2269: QuickAdd preview parent role="status" に title 付与し
 * aria-label と sync (live region 系 aria-label の title pair 補完、MCP path A 経由発見)。
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

  const qa = readFileSync(resolve(here, '../src/components/workspace/quick-add.tsx'), 'utf8')
  if (!qa.includes('iter2269') || !qa.includes('title={`解析結果 — ${previewSummary}`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'QuickAdd preview parent title が aria-label と sync されていない',
    })
  }
  // aria-label + title 計 2 出現
  const previewText = (qa.match(/`解析結果 — \$\{previewSummary\}`/g) || []).length
  if (previewText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `解析結果 出現 ${previewText} 回、aria-label + title 計 2 回必要`,
    })
  }

  const home = readFileSync(resolve(here, '../src/app/page.tsx'), 'utf8')
  if (!home.includes('iter2267')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2267 Workspace 一覧 ul title が消えている',
    })
  }

  const sp = readFileSync(resolve(here, '../src/components/workspace/sprints-panel.tsx'), 'utf8')
  if (!sp.includes('iter2265')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2265 sprint-defaults-edit-btn title が消えている',
    })
  }

  const mustBadge = readFileSync(
    resolve(here, '../src/components/workspace/must-badge.tsx'),
    'utf8',
  )
  if (!mustBadge.includes('title="MUST タスク"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1843 MustBadge title が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — QuickAdd preview parent title sync 完了、live region 系 aria-label title pair 補完 (MCP path A 経由発見)',
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
