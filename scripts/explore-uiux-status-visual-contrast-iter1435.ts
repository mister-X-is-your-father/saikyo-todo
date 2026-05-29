/**
 * Phase 6.15 loop iter1435 (mode-D = Desktop a11y axe sweep):
 * populated Inbox / Backlog で axe scan → `<span aria-hidden="true">不明</span>`
 * (Item.status=unknown / null / cancelled の Backlog ステータス column 表示) の
 * `text-zinc-500` (#71717a) が `bg-zinc-100` (#f4f4f5) 上 **4.13:1 で AA 未達**
 * (WCAG 1.4.3、normal text 4.5:1 必要)。cancelled も同 `text-zinc-500 line-through`
 * で同 violation。
 *
 * 修正: src/features/item/status-visual.ts の UNKNOWN_CONFIG.textClass と
 * STATUS_MAP.cancelled.textClass を `text-zinc-500` → `text-zinc-700` (#3f3f46) に。
 * `text-zinc-700` on `bg-zinc-100` = 9.62:1 で AA + AAA pass。cancelled の
 * line-through 視覚は維持、ただ darker tone で "muted gray" 認識は保たれる。
 *
 * 1 source 修正で Inbox / Backlog / Today / Dashboard / Kanban どこでも
 * status chip 表示が contrast pass。light と dark 両 mode 共通 (chip 配色は
 * theme 不変)。
 *
 * 経路 B (axe-core injection): populated views axe scan で発見 → fix → verify。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-status-visual-contrast-iter1435.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

function main(): void {
  const findings: Finding[] = []

  const src = readFileSync(resolve(process.cwd(), 'src/features/item/status-visual.ts'), 'utf8')

  // UNKNOWN_CONFIG textClass = text-zinc-700
  if (!src.includes("textClass: 'text-zinc-700',")) {
    findings.push({
      level: 'error',
      message: 'status-visual.ts: UNKNOWN_CONFIG.textClass が text-zinc-700 になっていない',
    })
  }
  // cancelled textClass = text-zinc-700 line-through
  if (!src.includes("textClass: 'text-zinc-700 line-through',")) {
    findings.push({
      level: 'error',
      message: 'status-visual.ts: cancelled.textClass が text-zinc-700 line-through になっていない',
    })
  }
  // regression guard: text-zinc-500 が再混入していないこと
  if (src.includes('text-zinc-500')) {
    findings.push({
      level: 'error',
      message: 'status-visual.ts: text-zinc-500 が再混入 (4.13:1 AA 未達 regression)',
    })
  }

  console.log(`\n=== Findings (iter1435 status-visual contrast) ===`)
  if (findings.length === 0)
    console.log(
      '(なし) — UNKNOWN + cancelled textClass = text-zinc-700 (9.62:1 AA+AAA pass), 500 regression なし',
    )
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()
