/**
 * Phase 6.15 loop iter1191: create-time-entry-form teCategory select aria-label visible-prefix
 * regression guard。
 *
 * iter1191 で発見した visible-prefix 漏れ (filter-status iter1182 / filter-sprint iter1183 /
 * gantt-zoom iter1190 と同 sweep): create-time-entry-form.tsx `teCategory` select の旧
 * aria-label `カテゴリ (現在: ${label})` は visible (option text = {c.label}) を中位置
 * "カテゴリ (現在: **label**)" に持ち voice control prefix-matching「click {label}」 match 不可
 * (substring 一致のみ)。
 *
 * 修正 (create-time-entry-form.tsx): IIFE で visible を先に算出し
 * `${visible} — カテゴリ (現在: ${visible})` で先頭固定
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-te-category-visible-prefix-iter1191.ts
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
  const filePath = resolve(here, '../src/components/time-entry/create-time-entry-form.tsx')
  const src = readFileSync(filePath, 'utf8')

  if (!src.includes('`${visible} — カテゴリ (現在: ${visible})`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'teCategory aria-label が visible-prefix 形式 "${visible} — カテゴリ..." でない',
    })
  }
  if (
    src.includes(
      '`カテゴリ (現在: ${TIME_ENTRY_CATEGORIES.find((c) => c.key === category)?.label ?? category})`',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 prefix-less "カテゴリ (現在: ...)" が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — teCategory aria-label は visible 冒頭固定済')
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
