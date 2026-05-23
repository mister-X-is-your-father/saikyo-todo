/**
 * Phase 6.15 loop iter1170: quick-add quick-add-submit !preview.title / isMust path aria-label
 * visible-prefix regression guard。
 *
 * iter1170 で発見した iter1114 sweep 残漏: quick-add.tsx `quick-add-submit` button
 * (visible "作成") の !preview.title / isMust 2 path 旧 aria-label は visible "作成" を
 * 中位置 ("タスクを **作成** するには…" / "DoD を入力して **作成** してください") に持ち
 * voice control prefix-matching「click 作成」 match 不可。pending / default は iter1114 で
 * 既に visible-prefix 化済、2 path だけ漏れていた。
 *
 * 修正 (quick-add.tsx):
 *   - !preview.title: '作成 — タスクを作成するにはタイトルを入力してください (Enter でも可)'
 *   - isMust: '作成 — MUST タスクは編集ダイアログから DoD を入力して作成してください'
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-quick-add-submit-not-trim-visible-prefix-iter1170.ts
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
  const filePath = resolve(here, '../src/components/workspace/quick-add.tsx')
  const src = readFileSync(filePath, 'utf8')

  for (const expected of [
    "'作成 — タスクを作成するにはタイトルを入力してください (Enter でも可)'",
    "'作成 — MUST タスクは編集ダイアログから DoD を入力して作成してください'",
  ]) {
    if (!src.includes(expected)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `quick-add-submit: 新 visible-prefix ${expected} が source に無い`,
      })
    }
  }
  for (const oldLbl of [
    "'タスクを作成するにはタイトルを入力してください (Enter でも可)'",
    "'MUST タスクは編集ダイアログから DoD を入力して作成してください'",
  ]) {
    if (src.includes(oldLbl)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `quick-add-submit: 旧 prefix-less ${oldLbl} が残存`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — quick-add-submit !preview.title / isMust path も visible "作成" 冒頭固定済',
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
