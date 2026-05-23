/**
 * Phase 6.15 loop iter1179: tag-picker tag-option (CommandItem) aria-label visible-prefix
 * regression guard。
 *
 * iter1179 で発見した visible-prefix 漏れ: tag-picker.tsx `tag-option-${t.id}` CommandItem
 * (visible "{t.name}" in span aria-hidden) の旧 aria-label 2 path とも visible "{t.name}" を
 * 中位置「タグ「**{t.name}**」」に持ち voice control prefix-matching「click {t.name}」 match 不可
 * (substring 一致のみ)。iter1124 trigger 同 pattern を option にも展開すべきだったが漏れていた。
 *
 * 修正 (tag-picker.tsx): visible "{t.name}" 冒頭固定 + em-dash 区切で descriptive 末尾保持
 *   - checked: `${t.name} — タグ付与中 (クリックで解除)`
 *   - unchecked: `${t.name} — タグを付与`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-tag-option-visible-prefix-iter1179.ts
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
  const filePath = resolve(here, '../src/components/workspace/tag-picker.tsx')
  const src = readFileSync(filePath, 'utf8')

  for (const expected of [
    '`${t.name} — タグ付与中 (クリックで解除)`',
    '`${t.name} — タグを付与`',
  ]) {
    if (!src.includes(expected)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `tag-option: 新 visible-prefix ${expected} が source に無い`,
      })
    }
  }
  for (const oldLbl of [
    '`タグ「${t.name}」を付与中 (クリックで解除)`',
    '`タグ「${t.name}」を付与する`',
  ]) {
    if (src.includes(oldLbl)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `tag-option: 旧 prefix-less ${oldLbl} が残存`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — tag-option CommandItem aria-label 2 path とも visible "{t.name}" 冒頭固定済',
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
