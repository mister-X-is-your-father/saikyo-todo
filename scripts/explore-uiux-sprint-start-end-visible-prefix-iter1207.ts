/**
 * Phase 6.15 loop iter1207: sprints-panel sprint-start + sprint-end date Input aria-label
 * visible-prefix regression guard。
 *
 * iter1207 で発見した visible-prefix 漏れ (sprint-name iter1206 と同 sweep):
 * sprints-panel.tsx の Sprint create / edit form date 4 件 form control:
 *
 * 1. `sprint-start` (create form) Input の旧 aria-label (全 3 path) `Sprint 開始日 (...)`
 *    は visible Label "開始" を中位置 "Sprint **開始**日 (...)" に持ち voice control
 *    prefix-matching「click 開始」 match 不可 (substring 一致のみ)。
 *
 * 2. `sprint-end` (create form) Input の旧 aria-label (全 3 path) `Sprint 終了日 (...)`
 *    は visible Label "終了" を中位置 "Sprint **終了**日 (...)" に持ち voice control
 *    prefix-matching「click 終了」 match 不可。
 *
 * 3. `sprint-edit-start-${id}` (edit form per sprint card) Input — 同 visible-prefix 漏れ
 * 4. `sprint-edit-end-${id}` (edit form per sprint card) Input — 同 visible-prefix 漏れ
 *
 * 修正 (sprints-panel.tsx):
 * - sprint-start: 全 3 path とも `開始 — Sprint 開始日 (...)` で先頭固定
 * - sprint-end: 全 3 path とも `終了 — Sprint 終了日 (...)` で先頭固定
 * - sprint-edit-start-${id}: 全 3 path とも `開始 — Sprint 開始日 (...)` で先頭固定
 * - sprint-edit-end-${id}: 全 3 path とも `終了 — Sprint 終了日 (...)` で先頭固定
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-sprint-start-end-visible-prefix-iter1207.ts
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

  const expectedStart = [
    "'開始 — Sprint 開始日 (必須、終了日以前)'",
    '`開始 — Sprint 開始日 (現在: ${startDate}、終了日 ${endDate} より後で不正)`',
    '`開始 — Sprint 開始日 (現在: ${startDate})`',
  ]
  for (const e of expectedStart) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `sprint-start aria-label 新 path 欠落: ${e}`,
      })
    }
  }

  const expectedEnd = [
    "'終了 — Sprint 終了日 (必須、開始日以降)'",
    '`終了 — Sprint 終了日 (現在: ${endDate}、開始日 ${startDate} より前で不正)`',
    '`終了 — Sprint 終了日 (現在: ${endDate})`',
  ]
  for (const e of expectedEnd) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `sprint-end aria-label 新 path 欠落: ${e}`,
      })
    }
  }

  // edit form (sprint-edit-start / sprint-edit-end) 新 path
  const expectedEditStart = [
    "'開始 — Sprint 開始日 (必須、終了日以前)'",
    '`開始 — Sprint 開始日 (現在: ${editStart} (${dayOfWeekJa(editStart)})、終了日 ${editEnd} より後で不正)`',
    '`開始 — Sprint 開始日 (現在: ${editStart} (${dayOfWeekJa(editStart)}))`',
  ]
  for (const e of expectedEditStart) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `sprint-edit-start aria-label 新 path 欠落: ${e}`,
      })
    }
  }
  const expectedEditEnd = [
    "'終了 — Sprint 終了日 (必須、開始日以降)'",
    '`終了 — Sprint 終了日 (現在: ${editEnd} (${dayOfWeekJa(editEnd)})、開始日 ${editStart} より前で不正)`',
    '`終了 — Sprint 終了日 (現在: ${editEnd} (${dayOfWeekJa(editEnd)}))`',
  ]
  for (const e of expectedEditEnd) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `sprint-edit-end aria-label 新 path 欠落: ${e}`,
      })
    }
  }

  // 旧 prefix-less 形式が active code に残存していないこと (comment 除外)
  const activeCode = src
    .split('\n')
    .filter((l) => !/^\s*\/\//.test(l) && !/^\s*\*/.test(l))
    .join('\n')
  const oldForbidden = [
    "'Sprint 開始日 (必須、終了日以前)'",
    '`Sprint 開始日 (現在: ${startDate}、終了日 ${endDate} より後で不正)`',
    '`Sprint 開始日 (現在: ${startDate})`',
    "'Sprint 終了日 (必須、開始日以降)'",
    '`Sprint 終了日 (現在: ${endDate}、開始日 ${startDate} より前で不正)`',
    '`Sprint 終了日 (現在: ${endDate})`',
    // edit form 旧 path
    '`Sprint 開始日 (現在: ${editStart} (${dayOfWeekJa(editStart)})、終了日 ${editEnd} より後で不正)`',
    '`Sprint 開始日 (現在: ${editStart} (${dayOfWeekJa(editStart)}))`',
    '`Sprint 終了日 (現在: ${editEnd} (${dayOfWeekJa(editEnd)})、開始日 ${editStart} より前で不正)`',
    '`Sprint 終了日 (現在: ${editEnd} (${dayOfWeekJa(editEnd)}))`',
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
    console.log(
      '(なし) — sprint-start/-end create + edit form aria-label は visible 冒頭固定済 (合計 12 path)',
    )
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
