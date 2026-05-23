/**
 * Phase 6.15 loop iter1167: workflows-panel wf-run-rerun button aria-label visible-prefix
 * regression guard。
 *
 * iter1167 で発見した visible-prefix 漏れ: workflows-panel.tsx
 * `wf-run-rerun-${id}` button (visible "再") の旧 aria-label 2 path とも visible "再" を
 * 中位置 "再実行中…" / "再実行" に持ち voice control prefix-matching「click 再」 match 不可
 * (substring 一致のみ)。iter1093-1166 sweep convention が漏れていた。
 *
 * 修正 (workflows-panel.tsx): visible "再" 冒頭固定 + em-dash 区切で descriptive 末尾
 *   - pending: `再 — 実行 ${id} を再実行中…`
 *   - default: `再 — 実行 ${id} を同じ input で再実行`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-wf-run-rerun-visible-prefix-iter1167.ts
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
  const filePath = resolve(here, '../src/components/workflow/workflows-panel.tsx')
  const src = readFileSync(filePath, 'utf8')

  for (const expected of [
    '`再 — 実行 ${r.id.slice(0, 8)} を再実行中…`',
    '`再 — 実行 ${r.id.slice(0, 8)} を同じ input で再実行`',
  ]) {
    if (!src.includes(expected)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `wf-run-rerun: 新 visible-prefix ${expected} が source に無い`,
      })
    }
  }
  for (const oldLbl of [
    '`実行 ${r.id.slice(0, 8)} を再実行中…`',
    '`実行 ${r.id.slice(0, 8)} を同じ input で再実行`',
  ]) {
    if (src.includes(oldLbl)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `wf-run-rerun: 旧 prefix-less ${oldLbl} が残存`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — wf-run-rerun aria-label 2 path とも visible "再" 冒頭固定済')
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
