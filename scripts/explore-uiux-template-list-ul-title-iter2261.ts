/**
 * Phase 6.15 loop iter2261: Template 一覧 ul に title 付与し aria-label と sync
 * (sources-list iter2191 / workflows-list iter2189 / Goal 一覧 iter2195 と同 一覧 ul
 * family title pattern を Template list にも展開、4 entity 一覧 ul family 完成)。
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

  const tp = readFileSync(resolve(here, '../src/components/template/templates-panel.tsx'), 'utf8')
  if (
    !tp.includes('iter2261') ||
    !tp.includes('title={`Template 一覧 — ${list.data!.length} 件`}')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'Template 一覧 ul title が aria-label と sync されていない',
    })
  }
  // aria-label + title 計 2 出現
  const listText = (tp.match(/`Template 一覧 — \$\{list\.data!\.length\} 件`/g) || []).length
  if (listText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `Template 一覧 出現 ${listText} 回、aria-label + title 計 2 回必要`,
    })
  }

  if (!tp.includes('iter2259')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2259 Template 作成フォーム title が消えている',
    })
  }

  const ip = readFileSync(
    resolve(here, '../src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (!ip.includes('iter2257')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2257 src-create-btn title が消えている',
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
      '(なし) — Template 一覧 ul title sync 完了、一覧 ul family 4 entity (sources / workflows / goals / templates) 完成 (MCP path A 経由発見)',
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
