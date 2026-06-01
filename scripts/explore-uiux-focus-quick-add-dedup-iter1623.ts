/**
 * Phase 6.15 loop iter1623: empty-state "クイック追加にフォーカス" button が
 * today-view / inbox-view / items-board の 3 file で完全同一 (data-testid 差分のみ)
 * 重複していたのを共有 component `FocusQuickAddButton` に集約。
 *
 * 重複量: 各 file ~15 行 (button + onClick + aria 属性 4 種 + visible span) × 3 = 45 行
 * 集約後: caller 1 行 + shared component 1 file (40 行)。差分は data-testid だけが prop。
 *
 * 効果:
 *   1. focus shortcut convention (`q`) が **1 file に集約** = 後続変更
 *      (em-dash sweep / aria-keyshortcuts 仕様変更 / visible 文言 i18n) が 1 箇所で完結
 *   2. 6 軸「効率化」 + 「認知低減」 — caller 側は 1 行 prop で済む
 *   3. testid は prop で明示 (3 状態 view 別 discriminate 維持、iter1621 sync-badge と同 pattern)
 *
 * 修正 file:
 *   src/components/workspace/focus-quick-add-button.tsx (新規、40 行)
 *   src/components/workspace/today-view.tsx              (import + 15 行 → 1 行)
 *   src/components/workspace/inbox-view.tsx              (import + 15 行 → 1 行)
 *   src/components/workspace/items-board.tsx             (import + 15 行 → 1 行)
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-focus-quick-add-dedup-iter1623.ts
 * 前提: なし (source 直読 invariant only、supabase / docker 起動不可 fire 対応)
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

  const sharedSrc = readFileSync(
    resolve(here, '../src/components/workspace/focus-quick-add-button.tsx'),
    'utf8',
  )
  const todaySrc = readFileSync(resolve(here, '../src/components/workspace/today-view.tsx'), 'utf8')
  const inboxSrc = readFileSync(resolve(here, '../src/components/workspace/inbox-view.tsx'), 'utf8')
  const boardSrc = readFileSync(
    resolve(here, '../src/components/workspace/items-board.tsx'),
    'utf8',
  )

  // (1) shared component が必要な convention 属性を持つ
  for (const check of [
    'aria-keyshortcuts="q"',
    'aria-label="クイック追加にフォーカス (キー: q) — quick-add input にフォーカスして即タスク入力"',
    `document.getElementById('quick-add-input')`,
  ]) {
    if (!sharedSrc.includes(check)) {
      findings.push({
        level: 'error',
        source: 'shared',
        message: `focus-quick-add-button.tsx に \`${check}\` が無い (集約 convention に欠落)`,
      })
    }
  }

  // (2) 3 caller が共有 component を import + 使用、旧 inline button が残存していない
  for (const [name, src, testId] of [
    ['today-view.tsx', todaySrc, 'today-empty-quick-add'],
    ['inbox-view.tsx', inboxSrc, 'inbox-empty-quick-add'],
    ['items-board.tsx', boardSrc, 'board-empty-quick-add'],
  ] as const) {
    if (!src.includes(`import { FocusQuickAddButton }`)) {
      findings.push({
        level: 'error',
        source: 'caller',
        message: `${name} が FocusQuickAddButton を import していない`,
      })
    }
    if (!src.includes(`<FocusQuickAddButton testId="${testId}"`)) {
      findings.push({
        level: 'error',
        source: 'caller',
        message: `${name} に <FocusQuickAddButton testId="${testId}" /> が無い`,
      })
    }
    // 旧 inline button の特徴的 marker が残っていないこと
    if (src.includes(`data-testid="${testId}"\n`) && !src.includes(`testId="${testId}"`)) {
      findings.push({
        level: 'error',
        source: 'caller',
        message: `${name} に旧 inline data-testid="${testId}" が残存 (FocusQuickAddButton に置換失敗)`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — empty-state quick-add focus button が共有 component に集約済 (iter1623 着地)',
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
