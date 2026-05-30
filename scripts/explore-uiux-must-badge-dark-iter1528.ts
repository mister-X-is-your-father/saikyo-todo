/**
 * Phase 6.15 loop iter1528: MUST badge (must-badge.tsx) に dark variant を補完
 * (mode-D contrast、iter1376/1493/1512-1527 chip dark sweep で central badge を最後に着地)。
 *
 * MUST badge は 6+ surface (today/inbox/personal-period/subtasks/backlog/archived/decompose
 * proposals/etc) で iconOnly / normal の 2 mode で使われる中央 component。light 固定 (bg-red-100
 * + text-red-700 + ring-red-200) で iter1376/1493/1512-1527 chip dark sweep からこぼれていた。
 * MUST は重要 marker で dark mode でも目立つべき、本 iter で着地。
 *
 * 修正 (must-badge.tsx):
 *   className: 既存 `bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 ring-1 ring-red-200 ring-inset`
 *            に追加 `dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/50`
 *
 * 影響範囲: MustBadge を import している全 caller (~10+ surface) で MUST 表示が dark mode 対応化。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-must-badge-dark-iter1528.ts
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
  const src = readFileSync(resolve(here, '../src/components/workspace/must-badge.tsx'), 'utf8')

  if (!src.includes('dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/50')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'must-badge に dark variant (bg/text/ring) が無い',
    })
  }
  // 旧 light が維持されているか (regression invariant)
  if (
    !src.includes(
      'bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 ring-1 ring-red-200 ring-inset',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'must-badge 旧 light class が破壊された',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — MUST badge に dark variant 補完済 (light invariant 維持)')
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
