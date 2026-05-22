/**
 * Phase 6.15 loop iter1115: integrations-panel SourceCard 3 action button (Pull / toggle /
 * imports-toggle) aria-label visible-prefix regression guard。
 *
 * iter1115 で発見した bug: 3 button × 多 path の旧 aria-label は visible "Pull" / "Pull 中…" /
 * "無効化"or"有効化" / "履歴" を末尾持ちで voice control prefix-matching match 不可。
 * iter1093-1114 sweep convention に合わせ visible 冒頭固定。
 *
 * 修正 (integrations-panel.tsx) — 多 path visible-prefix 形式統一:
 *   - src-pull default: "Pull — Source「name」を手動 Pull (sync 実行、30s timeout)"
 *   - src-pull pending: "Pull 中… — Source「name」を Pull 中"
 *   - src-pull disabled: 維持
 *   - src-toggle 有効化: "有効化 — Source「name」を有効化"
 *   - src-toggle 無効化: "無効化 — Source「name」を無効化"
 *   - src-toggle pending: 維持
 *   - src-imports-toggle 開: "履歴 — Source「name」の Pull 履歴 (直近 5 件) を表示"
 *   - src-imports-toggle 閉: "履歴 — Source「name」の Pull 履歴 (直近 5 件) を閉じる"
 *
 * src-delete は icon-only (Trash2 aria-hidden、visible text 無) で WCAG 違反無し、維持。
 *
 * 実 supabase + source fixture 必要、Docker 不在で fallback。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-integrations-src-actions-visible-prefix-iter1115.ts
 * 前提: なし
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
  const filePath = resolve(here, '../src/components/integrations/integrations-panel.tsx')
  const src = readFileSync(filePath, 'utf8')

  const expected = [
    'Pull — Source「${src.name}」を手動 Pull (sync 実行、30s timeout)',
    'Pull 中… — Source「${src.name}」を Pull 中',
    '有効化 — Source「${src.name}」を有効化',
    '無効化 — Source「${src.name}」を無効化',
    '履歴 — Source「${src.name}」の Pull 履歴 (直近 5 件) を表示',
    '履歴 — Source「${src.name}」の Pull 履歴 (直近 5 件) を閉じる',
  ]
  for (const e of expected) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `integrations-panel に visible-prefix '${e}' が無い`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — integrations-panel 3 action button aria-label は visible-prefix 配置済')
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
