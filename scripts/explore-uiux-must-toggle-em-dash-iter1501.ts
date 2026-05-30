/**
 * Phase 6.15 loop iter1501 (mode-D = aria-label sweep continuation):
 * MUST 絞り込み checkbox aria-label `(クリックで X)` → `— クリックで X` を
 * 3 component (item-edit-dialog / decompose-proposals-panel / template-items-editor)
 * 同時 sweep。
 *
 * Bug: 3 component の MUST checkbox の on/off aria-label は
 *   ON:  `'MUST が ON: 絶対落とさない (DoD 必須、クリックで OFF)'`
 *   OFF: `'MUST が OFF: 通常タスク (クリックで ON、DoD 必須化)'`
 * で () 区切が残存。iter1495 gantt 依存線 / iter1497 MUST 絞り込み (items-board
 * toolbar) / iter1499 engineer-trigger-button と同 「visible-prefix + paren action
 * hint」 古 pattern。iter1499 の (注) で別 iter に分離した 3 component sweep を
 * 本 iter で着地。
 *
 * 修正: 3 component の 両 path の `( DoD 必須、クリックで OFF )` →
 * `— DoD 必須、クリックで OFF` (ON path) / `( クリックで ON、DoD 必須化 )` →
 * `— クリックで ON、DoD 必須化` (OFF path) に統一。`:` 接続子と内側 `、` 区切は
 * 維持し、末尾 paren action hint のみ em-dash 化 (iter1499 engineer-trigger と同
 * pattern)。
 *
 * 連動 migration: iter873 + iter874 の regression-guard regex 2 ヶ所も em-dash
 * 形式に同 commit で更新 (検証目的 = 完全 content 維持 guard で区切 punctuation
 * は本質的 invariant ではないため、iter1494 副 iter798 / iter1499 iter874+876
 * regex 連動 migration と同 pattern)。
 *
 * 5 file edits (3 source + 2 test) で 1 commit、文字列差分は 6 行のみ。
 *
 * 経路 B: source-side regex assert + iter1495 gantt / iter1497 items-board /
 * iter1499 engineer-trigger invariant cross-check。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-must-toggle-em-dash-iter1501.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

function main(): void {
  const findings: Finding[] = []

  const files: { path: string; tag: string }[] = [
    {
      path: 'src/components/workspace/item-edit-dialog.tsx',
      tag: 'item-edit-dialog',
    },
    {
      path: 'src/components/workspace/decompose-proposals-panel.tsx',
      tag: 'decompose-proposals-panel',
    },
    {
      path: 'src/components/template/template-items-editor.tsx',
      tag: 'template-items-editor',
    },
  ]

  for (const f of files) {
    const src = readFileSync(resolve(process.cwd(), f.path), 'utf8')
    // 1. 旧 paren が残っていない
    if (src.includes("'MUST が ON: 絶対落とさない (DoD 必須、クリックで OFF)'")) {
      findings.push({
        level: 'error',
        message: `${f.tag}: ON path aria-label に () 区切が残存`,
      })
    }
    if (src.includes("'MUST が OFF: 通常タスク (クリックで ON、DoD 必須化)'")) {
      findings.push({
        level: 'error',
        message: `${f.tag}: OFF path aria-label に () 区切が残存`,
      })
    }
    // 2. em-dash 入り
    if (!src.includes("'MUST が ON: 絶対落とさない — DoD 必須、クリックで OFF'")) {
      findings.push({
        level: 'error',
        message: `${f.tag}: ON path aria-label に em-dash 区切が無い`,
      })
    }
    if (!src.includes("'MUST が OFF: 通常タスク — クリックで ON、DoD 必須化'")) {
      findings.push({
        level: 'error',
        message: `${f.tag}: OFF path aria-label に em-dash 区切が無い`,
      })
    }
  }

  // 3. iter873 + iter874 regex migration (em-dash 形式)
  const iter873 = readFileSync(
    resolve(process.cwd(), 'scripts/explore-uiux-must-checkbox-label-aria-hidden-iter873.ts'),
    'utf8',
  )
  if (iter873.includes('MUST が ON: 絶対落とさない \\(DoD 必須、クリックで OFF\\)')) {
    findings.push({
      level: 'error',
      message: 'iter873.ts: regex が旧 () 形式のまま (em-dash 移行漏れ)',
    })
  }
  const iter874 = readFileSync(
    resolve(process.cwd(), 'scripts/explore-uiux-checkbox-label-2-files-aria-hidden-iter874.ts'),
    'utf8',
  )
  if (iter874.includes('MUST が ON: 絶対落とさない \\(DoD 必須、クリックで OFF\\)')) {
    findings.push({
      level: 'error',
      message: 'iter874.ts: tie regex が旧 () 形式のまま (em-dash 移行漏れ)',
    })
  }

  // 4. iter1495 gantt / iter1497 items-board / iter1499 engineer invariant
  const gantt = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'),
    'utf8',
  )
  if (!gantt.includes("'依存線を表示中 — クリックで非表示'")) {
    findings.push({
      level: 'error',
      message: 'gantt-view.tsx: iter1495 invariant 喪失',
    })
  }
  const board = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )
  if (!board.includes("'MUST のみ表示中 — クリックで解除'")) {
    findings.push({
      level: 'error',
      message: 'items-board.tsx: iter1497 invariant 喪失',
    })
  }
  const etb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/engineer-trigger-button.tsx'),
    'utf8',
  )
  if (
    !etb.includes("'PR 自動起票が ON: Engineer 起動時に Draft PR も作成される — クリックで OFF'")
  ) {
    findings.push({
      level: 'error',
      message: 'engineer-trigger-button.tsx: iter1499 invariant 喪失',
    })
  }

  console.log(`\n=== Findings (iter1501 MUST 3-component toggle em-dash sweep) ===`)
  if (findings.length === 0)
    console.log(
      '(なし) — 3 MUST checkbox em-dash + iter873/874 regex + iter1495/1497/1499 invariant OK',
    )
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()
