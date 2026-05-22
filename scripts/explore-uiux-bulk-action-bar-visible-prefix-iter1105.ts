/**
 * Phase 6.15 loop iter1105: bulk-action-bar bulk-delete + bulk-clear button aria-label visible-prefix
 * regression guard。
 *
 * iter1105 で発見した bug: 2 button × 3 path の旧 aria-label は visible "削除" / "削除中…" /
 * "解除" を末尾持ちで voice control prefix-matching「click 削除/解除」 match 不可。
 *
 * 修正 (bulk-action-bar.tsx):
 *   - bulk-delete default: "削除 — 選択 N 件を削除 (soft delete: ゴミ箱で 30 日保持)"
 *   - bulk-delete pending: "削除中… — 選択 N 件を削除中 (soft delete: ゴミ箱で 30 日保持)"
 *   - bulk-clear: "解除 — 選択を全て解除"
 *
 * 実 supabase + auth + workspace + bulk selection 必要、Docker 不在で fallback。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-bulk-action-bar-visible-prefix-iter1105.ts
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
  const filePath = resolve(here, '../src/components/workspace/bulk-action-bar.tsx')
  const src = readFileSync(filePath, 'utf8')

  const expected = [
    '削除 — 選択 ${count} 件を削除 (soft delete: ゴミ箱で 30 日保持)',
    '削除中… — 選択 ${count} 件を削除中 (soft delete: ゴミ箱で 30 日保持)',
    '"解除 — 選択を全て解除"',
  ]
  for (const e of expected) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `bulk-action-bar に visible-prefix '${e}' が無い`,
      })
    }
  }
  // 旧 bare が残ってないか
  const oldBares = ['"選択を解除"', '`選択 ${count} 件を削除 (soft delete: ゴミ箱で 30 日保持)`']
  for (const s of oldBares) {
    if (src.includes(s)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `旧 bare aria-label '${s}' が残存`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — bulk-action-bar 2 button aria-label は visible-prefix 配置済')
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
