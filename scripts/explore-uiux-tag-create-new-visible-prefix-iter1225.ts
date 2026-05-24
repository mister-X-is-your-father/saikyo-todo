/**
 * Phase 6.15 loop iter1225: tag-picker tag-create-new CommandItem aria-label
 * visible-prefix regression guard。
 *
 * iter1225 で発見した visible-prefix 漏れ (tag-picker option iter1179 と同 sweep):
 * tag-picker.tsx の tag-create-new CommandItem は aria-label 無 (visible content
 * `「${query}」を作成` の accessible name は children text composition)、voice control
 * 「click 作成」 が visible 末尾 "を **作成**" 内に substring として substring 一致のみ。
 *
 * 修正 (tag-picker.tsx):
 * aria-label を明示追加: `${query} — 「query」を新規 tag として作成` で先頭固定
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-tag-create-new-visible-prefix-iter1225.ts
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

  if (
    !src.includes(
      "aria-label={`${query.trim() || '新規 tag'} — 「${query.trim()}」を新規 tag として作成`}",
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'tag-create-new aria-label 新形式 欠落',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — tag-create-new aria-label は visible 冒頭固定済')
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
