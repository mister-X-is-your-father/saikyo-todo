/**
 * Phase 6.15 loop iter1209: goals-panel goal-title + goal-desc form control aria-label
 * visible-prefix regression guard。
 *
 * iter1209 で発見した visible-prefix 漏れ (goal-start/-end iter1208 と同 sweep):
 * goals-panel.tsx Goal 作成 form の text 2 件 form control:
 *
 * 1. `goal-title` IMEInput の旧 aria-label (全 4 path) `Goal Objective (...)` は visible
 *    Label "Objective (なに / なぜ)" を中位置 "Goal **Objective** (...)" に持ち voice
 *    control prefix-matching「click Objective」 match 不可 (substring 一致のみ)。
 *
 * 2. `goal-desc` Textarea の旧 aria-label (全 3 path) `Goal の説明 (...)` は visible
 *    Label "説明 (任意、Cmd/Ctrl+Enter で作成)" を中位置 "Goal の **説明** (...)" に
 *    持ち voice control prefix-matching「click 説明」 match 不可。
 *
 * 修正 (goals-panel.tsx):
 * - goal-title: 全 4 path とも `Objective — Goal Objective (...)` で先頭固定
 * - goal-desc: 全 3 path とも `説明 — Goal の説明 (...)` で先頭固定
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-goal-title-desc-visible-prefix-iter1209.ts
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

  const expectedTitle = [
    "'Objective — Goal Objective (必須、最大 200 文字、なに / なぜを 1 行で)'",
    '`Objective — Goal Objective (現在 ${title.length} / 200 文字、空白のみは不正)`',
    '`Objective — Goal Objective (現在 ${title.length} / 200 文字、上限近接)`',
    '`Objective — Goal Objective (現在 ${title.length} / 200 文字)`',
  ]
  for (const e of expectedTitle) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `goal-title aria-label 新 path 欠落: ${e}`,
      })
    }
  }

  const expectedDesc = [
    "'説明 — Goal の説明 (任意、最大 2000 文字、Objective の補足や背景、Cmd/Ctrl+Enter で作成)'",
    '`説明 — Goal の説明 (現在 ${description.length} / 2000 文字、上限近接、Cmd/Ctrl+Enter で作成)`',
    '`説明 — Goal の説明 (現在 ${description.length} / 2000 文字、Cmd/Ctrl+Enter で作成)`',
  ]
  for (const e of expectedDesc) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `goal-desc aria-label 新 path 欠落: ${e}`,
      })
    }
  }

  // 旧 prefix-less 形式が active code に残存していないこと (comment 除外)
  const activeCode = src
    .split('\n')
    .filter((l) => !/^\s*\/\//.test(l) && !/^\s*\*/.test(l))
    .join('\n')
  const oldForbidden = [
    "'Goal Objective (必須、最大 200 文字、なに / なぜを 1 行で)'",
    '`Goal Objective (現在 ${title.length} / 200 文字、空白のみは不正)`',
    '`Goal Objective (現在 ${title.length} / 200 文字、上限近接)`',
    '`Goal Objective (現在 ${title.length} / 200 文字)`',
    "'Goal の説明 (任意、最大 2000 文字、Objective の補足や背景、Cmd/Ctrl+Enter で作成)'",
    '`Goal の説明 (現在 ${description.length} / 2000 文字、上限近接、Cmd/Ctrl+Enter で作成)`',
    '`Goal の説明 (現在 ${description.length} / 2000 文字、Cmd/Ctrl+Enter で作成)`',
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
    console.log('(なし) — goal-title + goal-desc aria-label は visible 冒頭固定済 (合計 7 path)')
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
