/**
 * Phase 6.15 loop iter1176: subtasks-panel subtasks-bulk-add-btn aria-label visible-prefix
 * regression guard (3 path)。
 *
 * iter1176 で発見した visible-prefix 漏れ: subtasks-panel.tsx `subtasks-bulk-add-btn` button
 * (visible "{pending? '追加中…' : `${N} 件追加`}") の旧 aria-label 3 path とも visible を
 * 中位置〜末尾に持ち voice control prefix-matching「click 追加 / 追加中…」 match 不可
 * (iter1093-1175 sweep convention が漏れていた)。
 *
 * 修正 (subtasks-panel.tsx): visible 冒頭固定 + em-dash 区切で descriptive 末尾保持
 *   - not-trim: '追加 — 子タスクを追加するには改行区切りで入力してください'
 *   - pending:  `追加中… — 子タスク ${N} 件を追加中…`
 *   - default:  `${N} 件追加 — 子タスク ${N} 件をまとめて追加`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-subtasks-bulk-add-visible-prefix-iter1176.ts
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
  const filePath = resolve(here, '../src/components/workspace/subtasks-panel.tsx')
  const src = readFileSync(filePath, 'utf8')

  for (const expected of [
    "'追加 — 子タスクを追加するには改行区切りで入力してください'",
    '`追加中… — 子タスク ${pendingTitleCount} 件を追加中…`',
    '`${pendingTitleCount} 件追加 — 子タスク ${pendingTitleCount} 件をまとめて追加`',
  ]) {
    if (!src.includes(expected)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `subtasks-bulk-add: 新 visible-prefix ${expected} が source に無い`,
      })
    }
  }
  for (const oldLbl of [
    "'子タスクを追加するには改行区切りで入力してください'",
    '`子タスク ${pendingTitleCount} 件を追加中…`',
    '`子タスク ${pendingTitleCount} 件をまとめて追加`',
  ]) {
    if (src.includes(oldLbl)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `subtasks-bulk-add: 旧 prefix-less ${oldLbl} が残存`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — subtasks-bulk-add-btn aria-label 3 path とも visible 冒頭固定済')
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
