/**
 * Phase 6.15 loop iter2265: sprint-defaults-edit-btn に title 付与し aria-label と sync
 * (budget-edit-btn iter2123 と同 edit-toggle button title pattern、MCP path A 経由発見)。
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

  const sp = readFileSync(resolve(here, '../src/components/workspace/sprints-panel.tsx'), 'utf8')
  if (
    !sp.includes('iter2265') ||
    !sp.includes(
      'title={`編集 — Sprint デフォルト 現在 ${DOW_JA[cur.startDow]}曜開始 / ${cur.lengthDays} 日 の編集モードを開く`}',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sprint-defaults-edit-btn title が aria-label と sync されていない',
    })
  }
  const editText = (
    sp.match(/編集 — Sprint デフォルト 現在 \$\{DOW_JA\[cur\.startDow\]\}曜開始/g) || []
  ).length
  if (editText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `sprint-defaults-edit-btn text 出現 ${editText} 回、aria-label + title 計 2 回必要`,
    })
  }

  const ms = readFileSync(
    resolve(here, '../src/components/workspace/workspace-mode-selector.tsx'),
    'utf8',
  )
  if (!ms.includes('iter2263')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2263 workspace-mode option title が消えている',
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
      '(なし) — sprint-defaults-edit-btn title sync 完了、edit-toggle button family Sprint defaults 補完 (MCP path A 経由発見)',
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
