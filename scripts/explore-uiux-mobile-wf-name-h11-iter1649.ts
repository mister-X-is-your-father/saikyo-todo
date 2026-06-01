/**
 * Phase 6.15 loop iter1649 (mode-M mobile audit): workflows-panel Workflow 作成 form の
 * wf-name IMEInput が shadcn Input default `h-9` (36px) で iPhone 13 viewport で
 * WCAG 2.5.5 (44x44 minimum tap target) 違反していたのを `h-11` (44px) に統一。
 *
 * iter1647 integrations-panel src-form 8 件 sweep と同 pattern を /workflows にも展開。
 * Playwright MCP audit で 326x32 と検出、`className="h-11"` 追加で 326x44 に修正。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-mobile-wf-name-h11-iter1649.ts
 * 前提: なし (source 直読 invariant)
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
  const src = readFileSync(resolve(here, '../src/components/workflow/workflows-panel.tsx'), 'utf8')

  // Find `id="wf-name"` and verify className="h-11" appears within 6 lines after
  const idx = src.indexOf('id="wf-name"')
  if (idx === -1) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'wf-name IMEInput が見つからない',
    })
  } else {
    const slice = src.slice(idx, idx + 400)
    if (!slice.includes('className="h-11"')) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: 'wf-name IMEInput に className="h-11" が無い (WCAG 2.5.5 violation on mobile)',
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — wf-name IMEInput が h-11 (WCAG 2.5.5 satisfy)')
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
