/**
 * Phase 6.15 loop iter1214: time-entries-table time-entry-sync button aria-label
 * visible-prefix regression guard。
 *
 * iter1214 で発見した visible-prefix 漏れ (subtasks-indent iter1213 と同 sweep):
 * time-entries-table.tsx `time-entry-sync-${e.id}` Button (visible "Sync" / "再Sync" /
 * "Sync 中…") の旧 aria-label は visible を中位置 ("「desc」(date) を **Sync 中…**" /
 * "...を **{再?}Sync**") に持ち voice control prefix-matching「click Sync / 再Sync /
 * Sync 中…」 match 不可 (substring 一致のみ)。
 *
 * 修正 (time-entries-table.tsx):
 * - pending: `Sync 中… — 「desc」(date) を Sync 中`
 * - failed (再Sync): `再Sync — 「desc」(date) を再 Sync`
 * - default (Sync): `Sync — 「desc」(date) を Sync`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-time-entry-sync-visible-prefix-iter1214.ts
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
  const filePath = resolve(here, '../src/components/time-entry/time-entries-table.tsx')
  const src = readFileSync(filePath, 'utf8')

  const expected = [
    "`Sync 中… — 「${e.description || '(無題)'}」(${e.workDate}) を Sync 中`",
    "`再Sync — 「${e.description || '(無題)'}」(${e.workDate}) を再 Sync`",
    "`Sync — 「${e.description || '(無題)'}」(${e.workDate}) を Sync`",
  ]
  for (const exp of expected) {
    if (!src.includes(exp)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `time-entry-sync aria-label 新 path 欠落: ${exp}`,
      })
    }
  }

  const activeCode = src
    .split('\n')
    .filter((l) => !/^\s*\/\//.test(l) && !/^\s*\*/.test(l))
    .join('\n')
  const oldForbidden = ["`「${e.description || '(無題)'}」(${e.workDate}) を Sync 中…`"]
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
    console.log('(なし) — time-entry-sync aria-label は visible 冒頭固定済 (全 3 path)')
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
