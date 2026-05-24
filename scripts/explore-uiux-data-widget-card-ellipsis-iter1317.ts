/**
 * Phase 6.15 loop iter1317: data-widget-card.tsx loading "読み込み中..." (ASCII)
 * を "読み込み中…" (U+2026) に統一 — codebase ellipsis convention 統一。
 *
 * iter1091 で確立した codebase ellipsis convention (ASCII "..." → Unicode "…")
 * の sweep 漏れ。data-widget-card.tsx は dashboard widget の loading state で
 * 多数 component (PDCA chip / TaskChute / 他) の loading に使われる、頻出。
 *
 * role="status" 経路で WCAG 2.5.3 divergence は無いが、SR 読み上げ + visible 表示の
 * ellipsis character を統一して codebase consistency 確保。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-data-widget-card-ellipsis-iter1317.ts
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
  const filePath = resolve(here, '../src/components/shared/data-widget-card.tsx')
  const src = readFileSync(filePath, 'utf8')

  // 新 Unicode "…" 存在を確認
  if (!src.includes('読み込み中…\n')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'data-widget-card に "読み込み中…" (U+2026) が存在しない',
    })
  }

  // 旧 ASCII "..." の active code 残存を確認 (comment 内の言及は除外)
  const codeOnly = src
    .split('\n')
    .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
    .join('\n')
  if (codeOnly.includes('読み込み中...')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 "読み込み中..." (ASCII 3 dot) が active code に残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — data-widget-card は "読み込み中…" (U+2026) で codebase convention 統一')
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
