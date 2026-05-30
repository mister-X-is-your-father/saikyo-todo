/**
 * Phase 6.15 loop iter1511: operation-board 期限超過 icon + item-edit-dialog DoD 必須
 * asterisk に dark variant を補完 (mode-D contrast、iter1508-1510 pattern を text-red-600
 * 系の残箇所 2 件に展開)。
 *
 * 残存していた 2 箇所:
 *   operation-board-widget.tsx (line 250): AlertOctagon icon for 期限超過 section header
 *     旧 `text-red-600` → 新 `text-red-600 dark:text-red-400`
 *   item-edit-dialog.tsx (line 781): DoD 必須 asterisk `*` span
 *     旧 `ml-1 text-red-600` → 新 `ml-1 text-red-600 dark:text-red-400`
 *
 * iter1391/1393/1508/1509/1510 と同 dark variant 補完 pattern、icon は aria-hidden で
 * SR 対象外、asterisk も aria-hidden (Label に「(必須)」 が無く視覚補助のみ) で WCAG 1.4.3
 * strict 必須ではないが「ぱっと見の伝達」 を dark mode でも保つため対応。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-overdue-required-icon-dark-iter1511.ts
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
  const obFilePath = resolve(here, '../src/components/workspace/operation-board-widget.tsx')
  const iedFilePath = resolve(here, '../src/components/workspace/item-edit-dialog.tsx')
  const ob = readFileSync(obFilePath, 'utf8')
  const ied = readFileSync(iedFilePath, 'utf8')

  // operation-board 期限超過 icon dark variant
  if (!ob.includes('text-red-600 dark:text-red-400')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'operation-board AlertOctagon icon (期限超過) に dark:text-red-400 が無い',
    })
  }
  // item-edit-dialog DoD required asterisk dark variant
  if (!ied.includes('ml-1 text-red-600 dark:text-red-400')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'item-edit-dialog DoD 必須 asterisk に dark:text-red-400 が無い',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — operation-board 期限超過 icon + item-edit-dialog DoD asterisk に dark variant 補完済',
    )
  } else {
    for (const f of findings) console.log(`  [${f.level}/${f.source}] ${f.message}`)
  }
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.filter((f) => f.level === 'error').length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
