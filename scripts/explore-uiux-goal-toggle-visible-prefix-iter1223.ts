/**
 * Phase 6.15 loop iter1223: goals-panel goal-toggle disclosure icon button aria-label
 * visible-prefix regression guard。
 *
 * iter1223 で発見した visible-prefix 漏れ (template-card title iter1221 と同 sweep):
 * goals-panel.tsx の goal-toggle disclosure icon button (Chevron):
 *
 * 旧 aria-label `Goal「${title}」の KR 一覧を{閉じる/開く}` は visible title を中位置
 * "Goal「**title**」の..." に持ち voice control prefix-matching「click {title}」 match 不可
 * (icon-only Chevron、visible text 無、title は siblings の CardTitle heading に存在)。
 *
 * 修正 (goals-panel.tsx):
 * `${goal.title} — Goal「${title}」の KR 一覧を{閉じる/開く}` で先頭固定
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-goal-toggle-visible-prefix-iter1223.ts
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

  if (
    !src.includes(
      "`${goal.title} — Goal「${goal.title}」の KR ${open ? '一覧を閉じる' : '一覧を開く'}`",
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'goal-toggle aria-label 新形式 欠落',
    })
  }

  const activeCode = src
    .split('\n')
    .filter((l) => !/^\s*\/\//.test(l) && !/^\s*\*/.test(l))
    .join('\n')
  if (
    activeCode.includes(
      "aria-label={`Goal「${goal.title}」の KR ${open ? '一覧を閉じる' : '一覧を開く'}`}",
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 prefix-less goal-toggle aria-label が active code に残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — goal-toggle aria-label は visible 冒頭固定済')
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
