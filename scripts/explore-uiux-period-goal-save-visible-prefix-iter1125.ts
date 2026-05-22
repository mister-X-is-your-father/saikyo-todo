/**
 * Phase 6.15 loop iter1125: period-goal-save button aria-label visible-prefix 配置 + WCAG 2.5.3
 * substring 修正の regression guard。
 *
 * iter1125 で発見した bug: period-goal-save の旧 aria-label 3 path は visible "ゴール保存" /
 * "保存中…" を末尾持ち + 一部 path は literal substring も不一致:
 *   - not-dirty: "...ゴールに変更がないため保存不要" — visible "ゴール保存" は continuous substring
 *     に含まれない (WCAG 2.5.3 違反)
 *   - default: "...ゴールを保存" — visible "ゴール保存" は "を" 挿入で分断 (WCAG 2.5.3 違反)
 *   - pending: "...ゴールを保存中…" — visible "保存中…" は末尾持ち (substring 一致だが prefix 不可)
 *
 * 修正 (personal-period-view.tsx) — 3 path visible-prefix:
 *   - not-dirty: "ゴール保存 — {period}ゴールに変更がないため保存不要"
 *   - default: "ゴール保存 — {period}ゴールを保存"
 *   - pending: "保存中… — {period}ゴールを保存中"
 *
 * 実 supabase + personal-period fixture 必要、Docker 不在で fallback。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-period-goal-save-visible-prefix-iter1125.ts
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
  const filePath = resolve(here, '../src/components/workspace/personal-period-view.tsx')
  const src = readFileSync(filePath, 'utf8')

  const expected = [
    'ゴール保存 — ${periodLabelJa(period)}ゴールに変更がないため保存不要',
    'ゴール保存 — ${periodLabelJa(period)}ゴールを保存',
    '保存中… — ${periodLabelJa(period)}ゴールを保存中',
  ]
  for (const e of expected) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `personal-period-view に visible-prefix '${e}' が無い`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — period-goal-save 3 path aria-label は visible-prefix 配置済')
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
