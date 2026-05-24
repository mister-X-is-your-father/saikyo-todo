/**
 * Phase 6.15 loop iter1211: subtasks-panel subtasks-bulk Textarea aria-label
 * visible-prefix regression guard。
 *
 * iter1211 で発見した visible-prefix 漏れ (p-dod iter1210 と同 sweep):
 * subtasks-panel.tsx `subtasks-bulk` Textarea の旧 aria-label (全 3 path)
 * `子タスクを改行区切りで bulk 追加 (...)` は visible Label
 * "改行区切りで bulk 追加 (Cmd/Ctrl+Enter で追加)" を中位置 "子タスクを **改行区切りで
 * bulk 追加** (...)" に持ち voice control prefix-matching「click 改行区切り」
 * match 不可 (substring 一致のみ)。
 *
 * 修正 (subtasks-panel.tsx):
 * 全 3 path とも `改行区切りで bulk 追加 — 子タスクを改行区切りで bulk 追加 (...)` で先頭固定
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-subtasks-bulk-visible-prefix-iter1211.ts
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

  const expected = [
    "'改行区切りで bulk 追加 — 子タスクを改行区切りで bulk 追加 (Cmd/Ctrl+Enter で追加)'",
    "'改行区切りで bulk 追加 — 子タスクを改行区切りで bulk 追加 (現在 空行のみで追加対象なし)'",
    '`改行区切りで bulk 追加 — 子タスクを改行区切りで bulk 追加 (現在 ${pendingTitleCount} 件、Cmd/Ctrl+Enter で追加)`',
  ]
  for (const e of expected) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `subtasks-bulk aria-label 新 path 欠落: ${e}`,
      })
    }
  }

  const activeCode = src
    .split('\n')
    .filter((l) => !/^\s*\/\//.test(l) && !/^\s*\*/.test(l))
    .join('\n')
  const oldForbidden = [
    "'子タスクを改行区切りで bulk 追加 (Cmd/Ctrl+Enter で追加)'",
    "'子タスクを改行区切りで bulk 追加 (現在 空行のみで追加対象なし)'",
    '`子タスクを改行区切りで bulk 追加 (現在 ${pendingTitleCount} 件、Cmd/Ctrl+Enter で追加)`',
  ]
  for (const o of oldForbidden) {
    if (activeCode.includes(o)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `旧 prefix-less subtasks-bulk aria-label が active code に残存: ${o}`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — subtasks-bulk aria-label は visible 冒頭固定済 (全 3 path)')
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
