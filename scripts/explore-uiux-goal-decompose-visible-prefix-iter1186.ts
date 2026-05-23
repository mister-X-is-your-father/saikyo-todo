/**
 * Phase 6.15 loop iter1186: goals-panel goal-decompose button aria-label visible-prefix
 * regression guard (3 path)。
 *
 * iter1186 で発見した visible-prefix 漏れ: goals-panel.tsx `goal-decompose-${id}` button
 * (visible "{pending? 'AI 分解中…' : 'AI 分解'}") の旧 aria-label 3 path とも visible を
 * 中位置「Goal「**title**」を **AI 分解** ...」に持ち voice control prefix-matching
 *「click AI 分解 / AI 分解中…」 match 不可 (substring 一致のみ)。iter1159 item-decompose
 * / iter1160 item-research と同 sweep を goal-decompose にも展開すべきだったが漏れていた。
 *
 * 修正 (goals-panel.tsx): visible 冒頭固定 + em-dash 区切で descriptive 末尾
 *   - !active:  `AI 分解 — Goal「title」は active でないため AI 分解不可`
 *   - pending:  `AI 分解中… — Goal「title」を AI 分解中…`
 *   - default:  `AI 分解 — Goal「title」を AI 分解 (5〜10 件の Item を作成)`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-goal-decompose-visible-prefix-iter1186.ts
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
  const filePath = resolve(here, '../src/components/workspace/goals-panel.tsx')
  const src = readFileSync(filePath, 'utf8')

  for (const expected of [
    '`AI 分解 — Goal「${goal.title}」は active でないため AI 分解不可`',
    '`AI 分解中… — Goal「${goal.title}」を AI 分解中…`',
    '`AI 分解 — Goal「${goal.title}」を AI 分解 (5〜10 件の Item を作成)`',
  ]) {
    if (!src.includes(expected)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `goal-decompose: 新 visible-prefix ${expected} が source に無い`,
      })
    }
  }
  for (const oldLbl of [
    '`Goal「${goal.title}」は active でないため AI 分解不可`',
    '`Goal「${goal.title}」を AI 分解中…`',
    '`Goal「${goal.title}」を AI 分解 (5〜10 件の Item を作成)`',
  ]) {
    if (src.includes(oldLbl)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `goal-decompose: 旧 prefix-less ${oldLbl} が残存`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — goal-decompose aria-label 3 path とも visible 冒頭固定済')
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
