/**
 * Phase 6.15 loop iter2203: risk-reasons ul に title 付与し aria-label と sync
 * (keybinding-combo iter2201 / FocusFormCta iter2199 と同 title=aria-label sync pattern)。
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

  const sr = readFileSync(
    resolve(here, '../src/components/sprint/sprint-risk-board-widget.tsx'),
    'utf8',
  )
  if (
    !sr.includes('iter2203') ||
    !sr.includes('title={`「${entry.item.title}」のリスク理由 ${entry.reasons.length } 件`}')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'risk-reasons ul title が aria-label と sync されていない',
    })
  }

  const kh = readFileSync(
    resolve(here, '../src/components/shared/keybindings-help-modal.tsx'),
    'utf8',
  )
  if (!kh.includes('iter2201')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2201 keybinding-combo dt title 同期 が消えている',
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
    console.log('(なし) — risk-reasons ul title 同期、iter2201-1843 invariant 不変')
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
