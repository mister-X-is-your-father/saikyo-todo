/**
 * Phase 6.15 loop iter1210: decompose-proposals-panel p-dod-${id} IMEInput aria-label
 * visible-prefix regression guard。
 *
 * iter1210 で発見した visible-prefix 漏れ (p-title iter1201 / p-desc iter1202 と同 sweep):
 * decompose-proposals-panel.tsx `p-dod-${proposal.id}` IMEInput の旧 aria-label
 * (全 4 path) `提案 DoD (...)` は visible Label "DoD" を中位置 "提案 **DoD** (...)" に
 * 持ち voice control prefix-matching「click DoD」 match 不可 (substring 一致のみ)。
 *
 * 修正 (decompose-proposals-panel.tsx):
 * 全 4 path とも `DoD — 提案 DoD (...)` で先頭固定
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-proposal-dod-visible-prefix-iter1210.ts
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
    "'DoD — 提案 DoD (MUST 必須、最大 2000 文字、完了条件を具体記述)'",
    '`DoD — 提案 DoD (現在 ${dod.length} / 2000 文字、空白のみは不正)`',
    '`DoD — 提案 DoD (現在 ${dod.length} / 2000 文字、上限近接)`',
    '`DoD — 提案 DoD (現在 ${dod.length} / 2000 文字)`',
  ]
  for (const e of expected) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `p-dod aria-label 新 path 欠落: ${e}`,
      })
    }
  }

  const activeCode = src
    .split('\n')
    .filter((l) => !/^\s*\/\//.test(l) && !/^\s*\*/.test(l))
    .join('\n')
  const oldForbidden = [
    "'提案 DoD (MUST 必須、最大 2000 文字、完了条件を具体記述)'",
    '`提案 DoD (現在 ${dod.length} / 2000 文字、空白のみは不正)`',
    '`提案 DoD (現在 ${dod.length} / 2000 文字、上限近接)`',
    '`提案 DoD (現在 ${dod.length} / 2000 文字)`',
  ]
  for (const o of oldForbidden) {
    if (activeCode.includes(o)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `旧 prefix-less p-dod aria-label が active code に残存: ${o}`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — p-dod aria-label は visible 冒頭固定済 (全 4 path)')
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
