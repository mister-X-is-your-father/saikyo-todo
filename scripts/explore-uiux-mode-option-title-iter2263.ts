/**
 * Phase 6.15 loop iter2263: workspace-mode-selector の 3 radio button option に
 * title 付与し aria-label と sync (workspace-mode radiogroup iter2215 と pair で
 * 3 option レベル個別 title 補完、MCP path A 経由発見)。
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

  const ms = readFileSync(
    resolve(here, '../src/components/workspace/workspace-mode-selector.tsx'),
    'utf8',
  )
  if (!ms.includes('iter2263') || !ms.includes('title={`${opt.label} — ${opt.description}`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'workspace-mode option title が aria-label と sync されていない',
    })
  }
  // aria-label + title 計 2 出現
  const optText = (ms.match(/`\$\{opt\.label\} — \$\{opt\.description\}`/g) || []).length
  if (optText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `workspace-mode option text 出現 ${optText} 回、aria-label + title 計 2 回必要`,
    })
  }
  // iter2215 radiogroup title sync 残存
  if (!ms.includes('iter2215')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2215 workspace-mode radiogroup title が消えている',
    })
  }

  const tp = readFileSync(resolve(here, '../src/components/template/templates-panel.tsx'), 'utf8')
  if (!tp.includes('iter2261') || !tp.includes('iter2259')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2259/2261 templates-panel title 系列が消えている',
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
      '(なし) — workspace-mode 3 option title sync 完了、radiogroup iter2215 と pair の 3 option レベル個別 title 補完 (MCP path A 経由発見)',
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
