/**
 * Phase 6.15 loop iter1166: decompose-proposals-panel agent-cancel button aria-label visible-prefix
 * regression guard。
 *
 * iter1166 で発見した visible-prefix 漏れ: decompose-proposals-panel.tsx
 * `agent-cancel` button (visible "中止") の旧 aria-label 2 path とも visible "中止" を
 * 中位置 "Agent を 中止 ..." に持ち voice control prefix-matching「click 中止」 match 不可
 * (substring 一致のみ)。iter1093-1165 sweep convention が漏れていた。
 *
 * 修正 (decompose-proposals-panel.tsx): visible "中止" 冒頭固定 + em-dash 区切
 *   - pending: `中止 — 実行中の Agent を中止中…`
 *   - default: `中止 — 実行中の Agent を中止 (Researcher / 分解処理を停止)`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-agent-cancel-visible-prefix-iter1166.ts
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
  const filePath = resolve(here, '../src/components/workspace/decompose-proposals-panel.tsx')
  const src = readFileSync(filePath, 'utf8')

  for (const expected of [
    "'中止 — 実行中の Agent を中止中…'",
    "'中止 — 実行中の Agent を中止 (Researcher / 分解処理を停止)'",
  ]) {
    if (!src.includes(expected)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `agent-cancel: 新 visible-prefix ${expected} が source に無い`,
      })
    }
  }
  for (const oldLbl of [
    "'実行中の Agent を中止中…'",
    "'実行中の Agent を中止 (Researcher / 分解処理を停止)'",
  ]) {
    if (src.includes(oldLbl)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `agent-cancel: 旧 prefix-less ${oldLbl} が残存`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — agent-cancel aria-label 2 path とも visible "中止" 冒頭固定済')
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
