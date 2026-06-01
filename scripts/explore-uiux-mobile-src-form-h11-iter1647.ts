/**
 * Phase 6.15 loop iter1647 (mode-M mobile audit): integrations-panel External Source 作成
 * form の IMEInput 8 件が `h-9` (default 36px) で iPhone 13 viewport (390x844) で
 * WCAG 2.5.5 (44x44 minimum tap target) 違反していたのを `h-11` (44px) に統一。
 *
 * 検出: Playwright MCP で `/integrations` をモバイル viewport で開き
 * `boundingBox().height < 44` を全 input/textarea/select で検査、6 visible input
 * (src-name / src-url / src-items-path / src-due-path / src-id-path / src-title-path) が
 * 326x32 と検出。さらに hidden yamory branch の 2 input (src-token / src-project-ids) も
 * 同じ default だったため計 8 件に修正。
 *
 * 修正: 各 IMEInput に `className="h-11"` を追加。shadcn Input の default h-9 を
 * project convention `h-11` (sprint-name / goal-title / quick-add 等で確立) に揃える。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-mobile-src-form-h11-iter1647.ts
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
  const src = readFileSync(
    resolve(here, '../src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )

  const ids = [
    'src-name',
    'src-token',
    'src-project-ids',
    'src-url',
    'src-items-path',
    'src-due-path',
    'src-id-path',
    'src-title-path',
  ]

  for (const id of ids) {
    // Find the IMEInput opening with `id="${id}"` and verify className="h-11" is on the next 1-2 lines
    const idx = src.indexOf(`id="${id}"`)
    if (idx === -1) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `IMEInput id="${id}" が見つからない`,
      })
      continue
    }
    // Check next 6 lines for className="h-11"
    const slice = src.slice(idx, idx + 400)
    if (!slice.includes('className="h-11"')) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `IMEInput id="${id}" に className="h-11" が無い (WCAG 2.5.5 violation on mobile)`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — 8 src-* IMEInput が h-11 (WCAG 2.5.5 satisfy)')
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
