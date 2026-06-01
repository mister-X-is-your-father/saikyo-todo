/**
 * Phase 6.15 loop iter1621: time-entry sync badge 3 状態 (synced/failed/pending) で
 * `data-testid="sync-badge"` が **同名 3 重複** になっていたのを状態別に分離
 * (`sync-badge-synced` / `sync-badge-failed` / `sync-badge-pending`)。iter1620 が
 * 推奨した「data-testid duplications」 軸の着地、em-dash sweep mature 後の最初の
 * 非 em-dash a11y/test convention 改善。
 *
 * 効果:
 *   1. Playwright locator が状態を **prefix で discriminate** 可能
 *      (`[data-testid="sync-badge-synced"]`)。汎用 enumeration は
 *      `[data-testid^="sync-badge-"]` で prefix-match を使う
 *   2. 旧 `[data-testid="sync-badge"]` を直書きしていた script (iter133) を
 *      prefix selector に追従済
 *   3. test 文脈で「どの状態の badge を assertion しているか」が selector
 *      自体で読み取れる (= 6 軸 「認知負荷低減」)
 *
 * 修正 file:
 *   src/components/time-entry/time-entries-table.tsx  (3 行)
 *   scripts/explore-uiux-time-entries-iter133.ts       (1 行、prefix selector へ)
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-sync-badge-testid-discriminable-iter1621.ts
 * 前提: なし (source 直読 invariant only、supabase / docker 起動不可 fire 対応)
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
  const tableSrc = readFileSync(
    resolve(here, '../src/components/time-entry/time-entries-table.tsx'),
    'utf8',
  )
  const exploreSrc = readFileSync(resolve(here, './explore-uiux-time-entries-iter133.ts'), 'utf8')

  // (1) 状態別 testid が 3 件あること
  const expectedTestids = ['sync-badge-synced', 'sync-badge-failed', 'sync-badge-pending']
  for (const t of expectedTestids) {
    if (!tableSrc.includes(`data-testid="${t}"`)) {
      findings.push({
        level: 'error',
        source: 'testid',
        message: `time-entries-table.tsx に data-testid="${t}" が無い`,
      })
    }
  }

  // (2) 旧 generic `sync-badge` 単独 testid が残っていないこと (duplications 解消)
  const oldGenericMatches = tableSrc.match(/data-testid="sync-badge"/g)
  if (oldGenericMatches && oldGenericMatches.length > 0) {
    findings.push({
      level: 'error',
      source: 'testid',
      message: `time-entries-table.tsx に旧 generic data-testid="sync-badge" が ${oldGenericMatches.length} 件残存 (状態別に分離されていない)`,
    })
  }

  // (3) iter133 script が prefix selector に追従済
  if (!exploreSrc.includes(`[data-testid^="sync-badge-"]`)) {
    findings.push({
      level: 'error',
      source: 'codify',
      message: `iter133 script が prefix selector ([data-testid^="sync-badge-"]) に追従していない`,
    })
  }
  if (exploreSrc.includes(`[data-testid="sync-badge"]`)) {
    findings.push({
      level: 'error',
      source: 'codify',
      message: `iter133 script に旧 generic selector [data-testid="sync-badge"] が残存`,
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — sync-badge 3 状態に discriminable data-testid 適用済 (iter1621 着地)')
  } else {
    for (const f of findings) console.log(`  [${f.level}/${f.source}] ${f.message}`)
  }
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.filter((f) => f.level === 'error').length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
