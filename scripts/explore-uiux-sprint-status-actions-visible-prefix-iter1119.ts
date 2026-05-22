/**
 * Phase 6.15 loop iter1119: sprints-panel SprintCard 4 status action button (activate / complete /
 * replan / cancel) aria-label visible-prefix regression guard。
 *
 * iter1119 で発見した bug: 4 button × 2 path = 8 aria-label の旧形式は visible "稼働開始"/"完了"/
 * "計画に戻す"/"中止" を末尾持ちで voice control prefix-matching match 不可。pending state は
 * "ステータスを変更中…" が共通だが visible は変わらない (button の visible label) ので prefix
 * 化対象。
 *
 * 修正 (sprints-panel.tsx) — 8 path visible-prefix:
 *   - activate: "稼働開始 — Sprint「name」を稼働開始" / "稼働開始 — ...ステータスを変更中…"
 *   - complete: "完了 — Sprint「name」を完了" / "完了 — ...変更中…"
 *   - replan: "計画に戻す — Sprint「name」を計画に戻す" / "計画に戻す — ...変更中…"
 *   - cancel: "中止 — Sprint「name」を中止" / "中止 — Sprint「name」を中止中…"
 *
 * 実 supabase + sprint fixture 必要、Docker 不在で fallback。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-sprint-status-actions-visible-prefix-iter1119.ts
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
  const filePath = resolve(here, '../src/components/workspace/sprints-panel.tsx')
  const src = readFileSync(filePath, 'utf8')

  const expected = [
    '稼働開始 — Sprint「${sprint.name}」を稼働開始',
    '完了 — Sprint「${sprint.name}」を完了',
    '計画に戻す — Sprint「${sprint.name}」を計画に戻す',
    '中止 — Sprint「${sprint.name}」を中止',
  ]
  for (const e of expected) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `sprints-panel に visible-prefix '${e}' が無い`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — sprints-panel 4 status action button aria-label は visible-prefix 配置済')
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
