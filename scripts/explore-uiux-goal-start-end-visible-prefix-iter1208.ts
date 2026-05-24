/**
 * Phase 6.15 loop iter1208: goals-panel goal-start + goal-end date Input aria-label
 * visible-prefix regression guard。
 *
 * iter1208 で発見した visible-prefix 漏れ (sprint-start/-end iter1207 と同 sweep):
 * goals-panel.tsx Goal 作成 form の date 2 件 form control:
 *
 * 1. `goal-start` Input の旧 aria-label (全 3 path) `Goal 開始日 (...)` は visible
 *    Label "開始" を中位置 "Goal **開始**日 (...)" に持ち voice control prefix-matching
 *    「click 開始」 match 不可 (substring 一致のみ)。
 *
 * 2. `goal-end` Input の旧 aria-label (全 3 path) `Goal 終了日 (...)` 同 pattern。
 *
 * 修正 (goals-panel.tsx):
 * - goal-start: 全 3 path とも `開始 — Goal 開始日 (...)` で先頭固定
 * - goal-end: 全 3 path とも `終了 — Goal 終了日 (...)` で先頭固定
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-goal-start-end-visible-prefix-iter1208.ts
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

  const expectedStart = [
    "'開始 — Goal 開始日 (必須、終了日以前)'",
    '`開始 — Goal 開始日 (現在: ${startDate}、終了日 ${endDate} より後で不正)`',
    '`開始 — Goal 開始日 (現在: ${startDate})`',
  ]
  for (const e of expectedStart) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `goal-start aria-label 新 path 欠落: ${e}`,
      })
    }
  }

  const expectedEnd = [
    "'終了 — Goal 終了日 (必須、開始日以降)'",
    '`終了 — Goal 終了日 (現在: ${endDate}、開始日 ${startDate} より前で不正)`',
    '`終了 — Goal 終了日 (現在: ${endDate})`',
  ]
  for (const e of expectedEnd) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `goal-end aria-label 新 path 欠落: ${e}`,
      })
    }
  }

  // 旧 prefix-less 形式が active code に残存していないこと (comment 除外)
  const activeCode = src
    .split('\n')
    .filter((l) => !/^\s*\/\//.test(l) && !/^\s*\*/.test(l))
    .join('\n')
  const oldForbidden = [
    "'Goal 開始日 (必須、終了日以前)'",
    '`Goal 開始日 (現在: ${startDate}、終了日 ${endDate} より後で不正)`',
    '`Goal 開始日 (現在: ${startDate})`',
    "'Goal 終了日 (必須、開始日以降)'",
    '`Goal 終了日 (現在: ${endDate}、開始日 ${startDate} より前で不正)`',
    '`Goal 終了日 (現在: ${endDate})`',
  ]
  for (const o of oldForbidden) {
    if (activeCode.includes(o)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `旧 prefix-less aria-label が active code に残存: ${o}`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — goal-start + goal-end aria-label は visible 冒頭固定済 (合計 6 path)')
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
