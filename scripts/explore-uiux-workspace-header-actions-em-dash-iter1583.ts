/**
 * Phase 6.15 loop iter1583: workspace-header header-actions group landmark aria-label paren を
 * em-dash 区切に migration (iter1093-1582 sweep convention 着地)。
 *
 * 旧 aria-label paren convention `"「${title}」 ヘッダー操作 (ページ固有アクション / ユーティリティ)"` は
 * iter1093-1582 sweep の em-dash 区切と divergent。区切のみ '(' → ' — ' に統一、closing ')' は削除。
 *
 * 修正 (workspace-header.tsx):
 *   `「${title}」 ヘッダー操作 (ページ固有アクション / ユーティリティ)`
 *   → `「${title}」 ヘッダー操作 — ページ固有アクション / ユーティリティ`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-workspace-header-actions-em-dash-iter1583.ts
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
  const src = readFileSync(
    resolve(here, '../src/components/workspace/workspace-header.tsx'),
    'utf8',
  )

  if (
    !src.includes(
      'aria-label={`「${title}」 ヘッダー操作 — ページ固有アクション / ユーティリティ`}',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'workspace-header header-actions group aria-label が em-dash 区切でない',
    })
  }
  if (
    src.includes('aria-label={`「${title}」 ヘッダー操作 (ページ固有アクション / ユーティリティ)`}')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'workspace-header header-actions group 旧 paren 区切 aria-label が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — workspace-header header-actions group aria-label が em-dash 区切')
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
