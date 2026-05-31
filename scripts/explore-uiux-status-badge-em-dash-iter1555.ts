/**
 * Phase 6.15 loop iter1555: status-badge StatusBadge aria-label を visible 冒頭 em-dash 形式に
 * migration (iter1093-1554 sweep convention 着地、WCAG 2.5.3 fix)。
 *
 * 旧 aria-label `"ステータス: ${cfg.label}"` は visible "${cfg.shortLabel}" (e.g., "完了" /
 * "TODO" / "blocked") を末尾の cfg.label にしか含まず voice control prefix-matching
 *「click 完了」 が strict prefix-match で不可 (substring 一致のみ)。iter1553/1554 sprint/goal
 * status Badge と同 pattern、visible 冒頭固定 + em-dash 区切。 status-badge は item / subtask /
 * dashboard / kanban の主要視覚要素なので、convention 統一は voice-control 対応の core。
 *
 * 修正 (status-badge.tsx):
 *   `ステータス: ${cfg.label}` → `${cfg.shortLabel} — ステータス: ${cfg.label}`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-status-badge-em-dash-iter1555.ts
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
  const src = readFileSync(resolve(here, '../src/components/workspace/status-badge.tsx'), 'utf8')

  if (!src.includes('aria-label={`${cfg.shortLabel} — ステータス: ${cfg.label}`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'StatusBadge aria-label が em-dash 形式 (visible 冒頭) でない',
    })
  }
  if (src.includes('aria-label={`ステータス: ${cfg.label}`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'StatusBadge 旧 aria-label (visible 末尾) が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — StatusBadge aria-label が em-dash 形式 (visible 冒頭固定)')
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
