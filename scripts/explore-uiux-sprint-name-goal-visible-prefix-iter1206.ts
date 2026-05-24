/**
 * Phase 6.15 loop iter1206: sprints-panel sprint-name + sprint-goal form control aria-label
 * visible-prefix regression guard。
 *
 * iter1206 で発見した visible-prefix 漏れ (tmpl-name iter1205 と同 sweep):
 * sprints-panel.tsx の Sprint 作成フォーム 2 件 form control:
 *
 * 1. `sprint-name` IMEInput の旧 aria-label (全 4 path) `Sprint 名前 (...)` は visible
 *    Label "名前" を中位置 "Sprint **名前** (...)" に持ち voice control prefix-matching
 *    「click 名前」 match 不可。
 *
 * 2. `sprint-goal` Textarea の旧 aria-label (全 3 path) `Sprint ゴール (...)` は visible
 *    Label "ゴール (任意、Cmd/Ctrl+Enter で作成)" を中位置 "Sprint **ゴール** (...)" に持ち
 *    voice control prefix-matching「click ゴール」 match 不可。
 *
 * 修正 (sprints-panel.tsx):
 * - sprint-name: 全 4 path とも `名前 — Sprint 名前 (...)` で先頭固定
 * - sprint-goal: 全 3 path とも `ゴール — Sprint ゴール (...)` で先頭固定
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-sprint-name-goal-visible-prefix-iter1206.ts
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
  const filePath = resolve(here, '../src/components/workspace/sprints-panel.tsx')
  const src = readFileSync(filePath, 'utf8')

  const expectedName = [
    "'名前 — Sprint 名前 (必須、最大 100 文字)'",
    '`名前 — Sprint 名前 (現在 ${name.length} / 100 文字、空白のみは不正)`',
    '`名前 — Sprint 名前 (現在 ${name.length} / 100 文字、上限近接)`',
    '`名前 — Sprint 名前 (現在 ${name.length} / 100 文字)`',
  ]
  for (const e of expectedName) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `sprint-name aria-label 新 path 欠落: ${e}`,
      })
    }
  }

  const expectedGoal = [
    "'ゴール — Sprint ゴール (任意、最大 500 文字、この Sprint で達成したいこと、Cmd/Ctrl+Enter で作成)'",
    '`ゴール — Sprint ゴール (現在 ${goal.length} / 500 文字、上限近接、Cmd/Ctrl+Enter で作成)`',
    '`ゴール — Sprint ゴール (現在 ${goal.length} / 500 文字、Cmd/Ctrl+Enter で作成)`',
  ]
  for (const e of expectedGoal) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `sprint-goal aria-label 新 path 欠落: ${e}`,
      })
    }
  }

  // 旧 prefix-less 形式が active code に残存していないこと (comment 除外)
  const activeCode = src
    .split('\n')
    .filter((l) => !/^\s*\/\//.test(l) && !/^\s*\*/.test(l))
    .join('\n')
  const oldForbidden = [
    "'Sprint 名前 (必須、最大 100 文字)'",
    '`Sprint 名前 (現在 ${name.length} / 100 文字、空白のみは不正)`',
    '`Sprint 名前 (現在 ${name.length} / 100 文字、上限近接)`',
    '`Sprint 名前 (現在 ${name.length} / 100 文字)`',
    "'Sprint ゴール (任意、最大 500 文字、この Sprint で達成したいこと、Cmd/Ctrl+Enter で作成)'",
    '`Sprint ゴール (現在 ${goal.length} / 500 文字、上限近接、Cmd/Ctrl+Enter で作成)`',
    '`Sprint ゴール (現在 ${goal.length} / 500 文字、Cmd/Ctrl+Enter で作成)`',
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
    console.log('(なし) — sprint-name + sprint-goal aria-label は visible 冒頭固定済 (合計 7 path)')
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
