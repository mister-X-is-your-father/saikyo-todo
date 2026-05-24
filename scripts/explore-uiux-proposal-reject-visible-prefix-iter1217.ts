/**
 * Phase 6.15 loop iter1217: decompose-proposals-panel proposal-reject icon-only X button
 * aria-label visible-prefix regression guard。
 *
 * iter1217 で発見した visible-prefix 漏れ (template-item delete iter1216 と同 sweep):
 * decompose-proposals-panel.tsx `proposal-${proposal.id}-reject` icon-only X button の旧
 * aria-label 2 path `「${title}」を却下[処理中…]` は visible 概念名 "却下" を末尾
 * "「title」を **却下**" に持ち voice control prefix-matching「click 却下」 match 不可
 * (icon-only X、visible text 無、title attribute "却下" は tooltip 専用)。
 *
 * 修正 (decompose-proposals-panel.tsx):
 * 2 path とも `却下[処理中…] — 「title」を却下[処理中]` で先頭固定
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-proposal-reject-visible-prefix-iter1217.ts
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
    '`却下処理中… — 「${proposal.title}」を却下処理中`',
    '`却下 — 「${proposal.title}」を却下`',
  ]
  for (const e of expected) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `proposal-reject aria-label 新 path 欠落: ${e}`,
      })
    }
  }

  const activeCode = src
    .split('\n')
    .filter((l) => !/^\s*\/\//.test(l) && !/^\s*\*/.test(l))
    .join('\n')
  if (activeCode.includes('`「${proposal.title}」を却下処理中…`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 prefix-less proposal-reject pending path が active code に残存',
    })
  }
  if (activeCode.includes('? `「${proposal.title}」を却下`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 prefix-less proposal-reject default path が active code に残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — proposal-reject aria-label は visible 冒頭固定済 (全 2 path)')
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
