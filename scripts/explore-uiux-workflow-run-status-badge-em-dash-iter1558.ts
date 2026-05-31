/**
 * Phase 6.15 loop iter1558: workflows-panel RunStatusBadge aria-label を visible 冒頭
 * em-dash 形式に migration (iter1093-1557 sweep convention 着地、WCAG 2.5.3 fix)。
 *
 * 旧 aria-label `"実行ステータス: ${label}"` は visible "${label}" (e.g., "成功" / "失敗" / "実行中") を
 * 末尾に持ち voice control prefix-matching「click 成功」 が strict prefix-match で不可
 * (substring 一致のみ)。iter1553-1557 status/role Badge family と同 pattern、visible 冒頭固定 +
 * em-dash 区切。
 *
 * 修正 (workflows-panel.tsx):
 *   `実行ステータス: ${label}` → `${label} — 実行ステータス`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-workflow-run-status-badge-em-dash-iter1558.ts
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

  if (!src.includes('aria-label={`${label} — 実行ステータス`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'workflow RunStatusBadge aria-label が em-dash 形式 (visible 冒頭) でない',
    })
  }
  if (src.includes('aria-label={`実行ステータス: ${label}`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'workflow RunStatusBadge 旧 aria-label (visible 末尾) が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — workflow RunStatusBadge aria-label が em-dash 形式 (visible 冒頭固定)')
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
