/**
 * Phase 6.15 loop iter1695: schedule-item-picker の search input aria-label を
 * em-dash convention に統一。
 *
 * 旧:
 *   empty:    'task を検索 (タイトルで部分一致)'                    ← paren
 *   non-empty: 'task を検索 (現在のクエリ "..." — N 文字)'          ← paren と em-dash の mix
 *
 * 新:
 *   empty:    'task を検索 — タイトルで部分一致'                    ← em-dash
 *   non-empty: 'task を検索 — 現在のクエジリ "..." (N 文字)'         ← em-dash + 数値 paren
 *
 * iter1093-1577 sweep の em-dash visible-prefix convention と統一。command-palette /
 * assignee-picker / tag-picker (aria-label="<entity> — <action>") と format 揃え。
 *
 * 実行: pnpm tsx scripts/explore-uiux-picker-search-em-dash-iter1695.ts
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

  const picker = readFileSync(
    resolve(here, '../src/components/schedule/schedule-item-picker.tsx'),
    'utf8',
  )

  // 1. 旧 paren prefix が消失
  if (picker.includes("'task を検索 (タイトルで部分一致)'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'schedule-item-picker empty branch に旧 paren convention が残存',
    })
  }

  // 2. 新 em-dash empty が存在
  if (!picker.includes('task を検索 — タイトルで部分一致')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'schedule-item-picker empty branch に em-dash convention が無い',
    })
  }

  // 3. 新 em-dash non-empty が存在
  if (!picker.includes('task を検索 — 現在のクエリ')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'schedule-item-picker non-empty branch に em-dash convention が無い',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — schedule-item-picker search aria-label が em-dash convention')
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
