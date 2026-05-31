/**
 * Phase 6.15 loop iter1584: comment-thread 2 group landmark aria-label を
 * paren convention から em-dash 区切に統一 (iter1093-1583 sweep convention 着地)。
 *
 * 同 file 2 group 一括変換:
 *   - 編集操作 group (line 252): paren → em-dash
 *   - 操作 group (line 300): paren → em-dash
 *
 * iter1578-1583 paren → em-dash sweep family と同 pattern。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-comment-thread-groups-em-dash-iter1584.ts
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
  const src = readFileSync(resolve(here, '../src/components/workspace/comment-thread.tsx'), 'utf8')

  if (!src.includes('」の編集操作 — キャンセル / 保存')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'comment 編集操作 group aria-label が em-dash 形式でない',
    })
  }
  if (!src.includes('」の操作 — 編集 / 削除、自分の投稿のみ')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'comment 操作 group aria-label が em-dash 形式でない',
    })
  }
  if (src.includes('」の編集操作 (キャンセル / 保存)')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'comment 編集操作 旧 paren convention 残存',
    })
  }
  if (src.includes('」の操作 (編集 / 削除、自分の投稿のみ)')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'comment 操作 旧 paren convention 残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — comment-thread 2 group aria-label が em-dash 形式')
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
