/**
 * Phase 6.15 loop iter2239: template-card title disclosure button に title 付与し
 * aria-label state-dependent と sync (proposal-title-btn iter2223 / op-board-itemrow
 * iter2225 と同 list-item disclosure pattern)。
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
    !tp.includes('iter2239') ||
    !tp.includes(
      "title={`${t.name} — Template「${t.name}」(${t.kind}${t.scheduleCron ? ` · ${t.scheduleCron}` : ''}) の詳細を${expandedId === t.id ? '閉じる' : '開く'}`}",
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'template-card title disclosure button title が aria-label と sync されていない',
    })
  }

  const isp = readFileSync(
    resolve(here, '../src/components/workspace/item-summary-panel.tsx'),
    'utf8',
  )
  if (!isp.includes('iter2237')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2237 item-summary 3 chip title が消えている',
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
    console.log('(なし) — template-card title disclosure button title sync 完了')
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
