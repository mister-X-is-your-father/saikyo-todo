/**
 * Phase 6.15 loop iter2267: 参加している Workspace 一覧 ul (home page) に title 付与し
 * aria-label と sync (一覧 ul family 5 entity 完成、MCP path A 経由発見)。
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

  const home = readFileSync(resolve(here, '../src/app/page.tsx'), 'utf8')
  if (!home.includes('iter2267') || !home.includes('title="参加している Workspace 一覧"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '参加している Workspace 一覧 ul title が aria-label と sync されていない',
    })
  }
  // aria-label + title 計 2 出現
  const homeText = (home.match(/参加している Workspace 一覧/g) || []).length
  if (homeText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `Workspace 一覧 text 出現 ${homeText} 回、aria-label + title 計 2 回必要`,
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
      '(なし) — 参加している Workspace 一覧 ul title sync 完了、一覧 ul family 5 entity (sources / workflows / goals / templates / workspaces) 完成 (MCP path A 経由発見)',
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
