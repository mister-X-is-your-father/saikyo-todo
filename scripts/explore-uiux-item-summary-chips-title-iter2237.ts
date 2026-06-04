/**
 * Phase 6.15 loop iter2237: item-summary-panel 3 chip (progress / dependency /
 * latest-activity) に title 付与し aria-label と sync (ItemEditDialog サマリタブ内の
 * status chip family 完成)。
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

  const isp = readFileSync(
    resolve(here, '../src/components/workspace/item-summary-panel.tsx'),
    'utf8',
  )
  if (!isp.includes('iter2237')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'item-summary-panel iter2237 marker が無い',
    })
  }
  // 3 chip それぞれの title 出現確認
  // progress chip: aria-label + title 計 2 出現の "子タスク進捗 —" prefix
  const progPrefix = (isp.match(/子タスク進捗 — \${formatDescendantsActivityHintJa/g) || []).length
  if (progPrefix < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `progress chip 「子タスク進捗 — \${formatDescendantsActivityHintJa」 出現 ${progPrefix} 回、aria-label + title 計 2 回必要`,
    })
  }
  // dependency chip: 2 出現
  const depPrefix = (isp.match(/`依存 — \$\{formatDependencyReadiness/g) || []).length
  if (depPrefix < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `dependency chip 「依存 — \${formatDependencyReadiness」 出現 ${depPrefix} 回、aria-label + title 計 2 回必要`,
    })
  }
  // latest-activity chip: 2 出現
  const actCount = (
    isp.match(/formatLatestActivityJa\(latestActivity, now, formatRelativeTime\)/g) || []
  ).length
  if (actCount < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `latest-activity chip formatLatestActivityJa 出現 ${actCount} 回、aria-label + title 計 2 回必要 (subtext を含めると更に多くなる、>=2 だけ確認)`,
    })
  }

  const tce = readFileSync(
    resolve(here, '../src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  if (!tce.includes('iter2235')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2235 team-context save button title が消えている',
    })
  }

  const fqab = readFileSync(
    resolve(here, '../src/components/workspace/focus-quick-add-button.tsx'),
    'utf8',
  )
  if (!fqab.includes('iter2233')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2233 FocusQuickAddButton title が消えている',
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
      '(なし) — item-summary-panel 3 chip title sync 完了、ItemEditDialog サマリタブ status chip family 完成',
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
