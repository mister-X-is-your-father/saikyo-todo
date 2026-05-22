/**
 * Phase 6.15 loop iter1107: schedule-item-picker cancel button aria-label visible-prefix
 * regression guard。
 *
 * iter1107 で発見した bug: schedule-picker-cancel の旧 aria-label "task pick をキャンセル"
 * は visible "キャンセル" を末尾持ちで voice control prefix-matching「click キャンセル」
 * match 不可。iter1093-1106 sweep convention に合わせ visible 冒頭固定。
 *
 * 修正 (schedule-item-picker.tsx): aria-label を "キャンセル — task pick を破棄" に変更。
 *
 * schedule-item-picker は実 supabase + schedule fixture 必要、Docker 不在で fallback。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-schedule-picker-cancel-visible-prefix-iter1107.ts
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
  const filePath = resolve(here, '../src/components/schedule/schedule-item-picker.tsx')
  const src = readFileSync(filePath, 'utf8')

  if (!src.includes('"キャンセル — task pick を破棄"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `schedule-picker-cancel aria-label が visible-prefix "キャンセル — task pick を破棄" でない`,
    })
  }
  if (src.includes('"task pick をキャンセル"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `旧 aria-label "task pick をキャンセル" が残存`,
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — schedule-item-picker cancel aria-label は visible-prefix 配置済')
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
