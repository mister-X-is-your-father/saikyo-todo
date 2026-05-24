/**
 * Phase 6.15 loop iter1201: decompose-proposals-panel p-title-${id} Input aria-label
 * visible-prefix regression guard。
 *
 * iter1201 で発見した visible-prefix 漏れ (sprint-defaults-length iter1200 と同 sweep):
 * decompose-proposals-panel.tsx `p-title-${proposal.id}` IMEInput の旧 aria-label
 * (4 path とも) `提案タイトル (...)` は visible Label "タイトル" を中位置
 * "提案 **タイトル** (...)" に持ち voice control prefix-matching「click タイトル」
 * match 不可 (substring 一致のみ)。
 *
 * 修正 (decompose-proposals-panel.tsx):
 * `タイトル — 提案タイトル (...)` で先頭固定 (全 4 path)
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-proposal-title-visible-prefix-iter1201.ts
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
    "'タイトル — 提案タイトル (必須、最大 500 文字)'",
    '`タイトル — 提案タイトル (現在 ${title.length} / 500 文字、空白のみは不正)`',
    '`タイトル — 提案タイトル (現在 ${title.length} / 500 文字、上限近接)`',
    '`タイトル — 提案タイトル (現在 ${title.length} / 500 文字)`',
  ]
  for (const e of expected) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `p-title aria-label 新 path 欠落: ${e}`,
      })
    }
  }

  // 旧 prefix-less 形式が active code に残存していないこと (comment 除外)
  const activeCode = src
    .split('\n')
    .filter((l) => !/^\s*\/\//.test(l) && !/^\s*\*/.test(l))
    .join('\n')
  const oldForbidden = [
    "'提案タイトル (必須、最大 500 文字)'",
    '`提案タイトル (現在 ${title.length} / 500 文字、空白のみは不正)`',
    '`提案タイトル (現在 ${title.length} / 500 文字、上限近接)`',
    '`提案タイトル (現在 ${title.length} / 500 文字)`',
  ]
  for (const o of oldForbidden) {
    if (activeCode.includes(o)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `旧 prefix-less p-title aria-label が active code に残存: ${o}`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — p-title aria-label は visible 冒頭固定済 (全 4 path)')
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
