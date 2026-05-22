/**
 * Phase 6.15 loop iter1102: BudgetPanel cancel / save button aria-label visible-prefix regression
 * guard。
 *
 * iter1102 で発見した bug: budget-edit-cancel / budget-save-btn の旧 aria-label
 *   - "AI 月次コスト上限の編集をキャンセル"
 *   - "AI 月次コスト上限と警告閾値を保存"
 *   - "AI 月次コスト上限を保存中…"
 * は visible "キャンセル" / "保存" / "保存中…" を末尾持ち、voice control prefix-matching で
 * 「click 保存/キャンセル」 match 不可。iter1093-1101 sweep convention に合わせ visible 冒頭固定。
 *
 * 修正 (budget-panel.tsx): aria-label を visible-prefix 形式に統一:
 *   - cancel: "キャンセル — AI 月次コスト上限の編集を破棄"
 *   - save default: "保存 — AI 月次コスト上限と警告閾値を保存"
 *   - save pending: "保存中… — AI 月次コスト上限を保存中"
 *
 * BudgetPanel は実 supabase + auth + workspace 必要、Docker 不在で browser 不能のため
 * source-of-truth 直読 invariant fallback。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-budget-cancel-save-visible-prefix-iter1102.ts
 * 前提: なし (filesystem 読み込みのみ)
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
  const filePath = resolve(here, '../src/components/workspace/budget-panel.tsx')
  const src = readFileSync(filePath, 'utf8')

  const expected = [
    'キャンセル — AI 月次コスト上限の編集を破棄',
    '保存 — AI 月次コスト上限と警告閾値を保存',
    '保存中… — AI 月次コスト上限を保存中',
  ]
  for (const e of expected) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `budget-panel に visible-prefix '${e}' が無い`,
      })
    }
  }
  // 旧 bare aria-label が残ってないか
  const oldBares = [
    '"AI 月次コスト上限の編集をキャンセル"',
    "'AI 月次コスト上限と警告閾値を保存'",
    "'AI 月次コスト上限を保存中…'",
  ]
  for (const s of oldBares) {
    if (src.includes(s)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `旧 bare-suffix aria-label '${s}' が残存`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — budget-panel cancel/save aria-label は visible-prefix 配置済')
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
