/**
 * Phase 6.15 loop iter2201: keybinding-combo dt に title 付与し aria-label と sync
 * (FocusFormCta iter2199 / StatCard iter2197 と同 title=aria-label sync pattern)。
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

  const kh = readFileSync(
    resolve(here, '../src/components/shared/keybindings-help-modal.tsx'),
    'utf8',
  )
  if (!kh.includes('iter2201') || !kh.includes('title={`${kb.combo} — ショートカット`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'keybinding-combo dt title が aria-label と sync されていない',
    })
  }
  // iter2071 invariant (keybindings dialog)
  if (!kh.includes('iter2071')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2071 keybindings-help-modal hint が消えている',
    })
  }

  const fc = readFileSync(resolve(here, '../src/components/shared/focus-form-cta.tsx'), 'utf8')
  if (!fc.includes('iter2199')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2199 FocusFormCta title 同期 が消えている',
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
    console.log('(なし) — keybinding-combo dt title 同期、iter2199-1843 invariant 不変')
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
