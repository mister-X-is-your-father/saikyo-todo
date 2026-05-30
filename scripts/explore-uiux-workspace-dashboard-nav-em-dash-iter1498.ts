/**
 * Phase 6.15 loop iter1498: workspace dashboard nav 8 forward Link aria-label を em-dash 統一
 * (regression guard、iter1001 の colon format からの migration)。
 *
 * iter1001 で nav 内 8 Link (Goals / Sprints / PDCA / Templates / Workflows / API 連携 /
 * Time Entries / Archive) に functional aria-label 追加 (`Goals: OKR / Goals (...) ページへ移動` 等)。
 * iter1226 workspace-mode-selector colon → em-dash migration と同 sweep。
 * iter1093-1497 em-dash convention に追従し 8 Link を一括 migration。
 *
 * 修正 (src/app/(workspace)/[workspaceId]/page.tsx):
 *   各 Link aria-label の `<visible>: <descriptive>` を `<visible> — <descriptive>` に変換
 *
 * 連動更新 (scripts/explore-uiux-workspace-dashboard-nav-link-aria-labels-iter1001.ts):
 *   8 Link regex 形式を ':' → ' — ' に連動 migration (検証目的 = functional content 存在
 *   guard で区切 punctuation は本質的 invariant ではないため)
 *
 * 注: visible content は bare label ('Goals' / 'Sprints' / 等) で voice control prefix
 * matching は visible-prefix 維持で影響なし。sub-page <main> aria-label (各々 colon なし
 * の自然文) との wording cross-check (iter1001) も維持。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-workspace-dashboard-nav-em-dash-iter1498.ts
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
  const filePath = resolve(here, '../src/app/(workspace)/[workspaceId]/page.tsx')
  const src = readFileSync(filePath, 'utf8')

  const expected: Array<[string, string]> = [
    ['Goals', 'aria-label="Goals — OKR / Goals (Objective + Key Results) ページへ移動"'],
    ['Sprints', 'aria-label="Sprints — Sprint 計画 → 稼働 → 完了 ページへ移動"'],
    ['PDCA', 'aria-label="PDCA — Plan / Do / Check / Act + Lead time ページへ移動"'],
    ['Templates', 'aria-label="Templates — ワークパッケージ定義 ページへ移動"'],
    ['Workflows', 'aria-label="Workflows — 自動化ワークフロー (n8n 風) ページへ移動"'],
    [
      'API 連携',
      'aria-label="API 連携 — 外部 API (Yamory / カスタム REST) → Item 取込 ページへ移動"',
    ],
    ['Time Entries', 'aria-label="Time Entries — 稼働入力 やったこと + 時間を記録 ページへ移動"'],
    ['Archive', 'aria-label="Archive — アーカイブ済 Item 一覧 ページへ移動"'],
  ]
  for (const [name, expectedLabel] of expected) {
    if (!src.includes(expectedLabel)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `workspace nav ${name} Link aria-label が em-dash 形式でない (${expectedLabel.slice(0, 55)}…)`,
      })
    }
  }

  // 旧 ':' 形式残存 check
  const old: Array<[string, string]> = [
    ['Goals', 'aria-label="Goals: OKR / Goals (Objective + Key Results) ページへ移動"'],
    ['Sprints', 'aria-label="Sprints: Sprint 計画 → 稼働 → 完了 ページへ移動"'],
    ['PDCA', 'aria-label="PDCA: Plan / Do / Check / Act + Lead time ページへ移動"'],
    ['Templates', 'aria-label="Templates: ワークパッケージ定義 ページへ移動"'],
    ['Workflows', 'aria-label="Workflows: 自動化ワークフロー (n8n 風) ページへ移動"'],
    [
      'API 連携',
      'aria-label="API 連携: 外部 API (Yamory / カスタム REST) → Item 取込 ページへ移動"',
    ],
    ['Time Entries', 'aria-label="Time Entries: 稼働入力 やったこと + 時間を記録 ページへ移動"'],
    ['Archive', 'aria-label="Archive: アーカイブ済 Item 一覧 ページへ移動"'],
  ]
  for (const [name, oldLabel] of old) {
    if (src.includes(oldLabel)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `workspace nav ${name} Link 旧 ':' 区切 aria-label が残存`,
      })
    }
  }

  // iter1496 invariant: <nav> outer aria-label landmark vocab paren 維持
  if (
    !src.includes(
      'aria-label="ワークスペース内 (Goals / Sprints / PDCA / Templates / Workflows / API / Time / Archive)"',
    )
  ) {
    findings.push({
      level: 'warning',
      source: 'a11y',
      message: 'iter995 invariant: <nav> aria-label landmark vocab が破壊された',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — workspace dashboard nav 8 Link aria-label が em-dash convention 統一済')
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
