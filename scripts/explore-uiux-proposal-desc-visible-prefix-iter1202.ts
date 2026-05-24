/**
 * Phase 6.15 loop iter1202: decompose-proposals-panel p-desc-${id} Textarea aria-label
 * visible-prefix regression guard。
 *
 * iter1202 で発見した WCAG 2.5.3 違反 + ja/en language divergence
 * (p-title iter1201 と同 sweep):
 * decompose-proposals-panel.tsx `p-desc-${proposal.id}` Textarea の旧 aria-label
 * (全 3 path) `提案 description (...)` は visible Label "説明 (Cmd/Ctrl+Enter で保存)"
 * を全く含まず WCAG 2.5.3 (Label in Name) 違反 + voice control「click 説明」
 * match 不可 (ja "説明" → en "description" の language divergence)。
 *
 * 修正 (decompose-proposals-panel.tsx):
 * `説明 — 提案 description (...)` で先頭固定 (全 3 path)
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-proposal-desc-visible-prefix-iter1202.ts
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

  const expected = [
    "'説明 — 提案 description (任意、最大 10000 文字、Markdown 可、Cmd/Ctrl+Enter で保存)'",
    '`説明 — 提案 description (現在 ${description.length} / 10000 文字、上限近接、Cmd/Ctrl+Enter で保存)`',
    '`説明 — 提案 description (現在 ${description.length} / 10000 文字、Cmd/Ctrl+Enter で保存)`',
  ]
  for (const e of expected) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `p-desc aria-label 新 path 欠落: ${e}`,
      })
    }
  }

  // 旧 prefix-less / WCAG 違反 形式が active code に残存していないこと (comment 除外)
  const activeCode = src
    .split('\n')
    .filter((l) => !/^\s*\/\//.test(l) && !/^\s*\*/.test(l))
    .join('\n')
  const oldForbidden = [
    "'提案 description (任意、最大 10000 文字、Markdown 可、Cmd/Ctrl+Enter で保存)'",
    '`提案 description (現在 ${description.length} / 10000 文字、上限近接、Cmd/Ctrl+Enter で保存)`',
    '`提案 description (現在 ${description.length} / 10000 文字、Cmd/Ctrl+Enter で保存)`',
  ]
  for (const o of oldForbidden) {
    if (activeCode.includes(o)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `旧 prefix-less p-desc aria-label が active code に残存: ${o}`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — p-desc aria-label は visible 冒頭固定済 (全 3 path)')
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
