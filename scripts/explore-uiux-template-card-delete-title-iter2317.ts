/**
 * Phase 6.15 loop iter2317: template-card delete button に title 付与し aria-label
 * state-dependent 2-path と sync (icon-only Trash2 で visible text 無、MCP path A 経由発見)。
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
  if (!tp.includes('iter2317')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'templates-panel iter2317 marker が無い',
    })
  }
  // delete pending text aria-label + title 計 2 出現
  const pendingText = (tp.match(/削除中… — Template「\$\{t\.name\}」を削除中/g) || []).length
  if (pendingText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `template-card delete pending 出現 ${pendingText} 回、aria-label + title 計 2 回必要`,
    })
  }
  const idleText = (tp.match(/削除 — Template「\$\{t\.name\}」を削除/g) || []).length
  if (idleText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `template-card delete idle 出現 ${idleText} 回、aria-label + title 計 2 回必要`,
    })
  }

  const rp = readFileSync(resolve(here, '../src/components/item/recovery-plan-section.tsx'), 'utf8')
  if (!rp.includes('iter2315')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2315 recovery-plan ol title が消えている',
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
    console.log('(なし) — template-card delete button title 2-path sync 完了 (MCP path A 経由発見)')
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
