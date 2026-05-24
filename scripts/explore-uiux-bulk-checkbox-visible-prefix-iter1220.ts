/**
 * Phase 6.15 loop iter1220: bulk-action-bar BulkCheckbox + BulkHeaderCheckbox aria-label
 * visible-prefix regression guard。
 *
 * iter1220 で発見した visible-prefix 漏れ (item-checkbox iter1219 と同 sweep):
 * bulk-action-bar.tsx の 2 icon-only checkbox:
 *
 * 1. `BulkCheckbox` 旧 aria-label 4 path (with/without itemTitle × checked/unchecked)
 *    `「title」を一括操作の対象に追加 / から外す` は visible 概念名 "一括操作対象" を
 *    中位置 "「title」を **一括操作** の..." に持ち voice control prefix-matching
 *    「click 一括操作」 match 不可 (icon-only checkbox、visible text 無、title attribute
 *    も無し)。
 *
 * 2. `BulkHeaderCheckbox` 旧 aria-label 2 path 同 pattern (visible 概念名 "全選択" / "全解除"
 *    が中位置)。
 *
 * 修正 (bulk-action-bar.tsx):
 * - BulkCheckbox: `${action} — ${descriptive}` で先頭固定 (action = "一括操作対象に追加" / "から外す")
 * - BulkHeaderCheckbox: `全選択 / 全解除 — ${descriptive}` で先頭固定
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-bulk-checkbox-visible-prefix-iter1220.ts
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
  const filePath = resolve(here, '../src/components/workspace/bulk-action-bar.tsx')
  const src = readFileSync(filePath, 'utf8')

  // BulkCheckbox 新 path (template literal を素直に検出)
  if (!src.includes('`${action} — 「${itemTitle}」を${action}`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'BulkCheckbox itemTitle path 新形式 欠落',
    })
  }
  if (!src.includes('`${action} — この行を${action}`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'BulkCheckbox no-title path 新形式 欠落',
    })
  }

  // BulkHeaderCheckbox 新 path
  if (!src.includes('`全解除 — 現ページ ${rowIds.length} 行をすべて選択中、クリックで全解除`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'BulkHeaderCheckbox all-selected path 新形式 欠落',
    })
  }
  if (!src.includes('`全選択 — 現ページ ${rowIds.length} 行をすべて一括操作の対象にする`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'BulkHeaderCheckbox all-unselected path 新形式 欠落',
    })
  }

  // 旧 prefix-less 形式が active code に残存していないこと (comment 除外)
  const activeCode = src
    .split('\n')
    .filter((l) => !/^\s*\/\//.test(l) && !/^\s*\*/.test(l))
    .join('\n')
  const oldForbidden = [
    "`「${itemTitle}」を一括操作の${checked ? '対象から外す' : '対象に追加'}`",
    "`この行を一括操作の${checked ? '対象から外す' : '対象に追加'}`",
    '`現ページ ${rowIds.length} 行をすべて選択中。クリックで全解除`',
    '`現ページ ${rowIds.length} 行をすべて一括操作の対象にする`',
  ]
  for (const o of oldForbidden) {
    if (activeCode.includes(o)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `旧 prefix-less aria-label が active code に残存: ${o}`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — BulkCheckbox + BulkHeaderCheckbox aria-label は visible 冒頭固定済')
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
