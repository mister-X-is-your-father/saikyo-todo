/**
 * Phase 6.15 loop iter1616: backlog-view sr-only caption paren を em-dash 区切に migration
 * (iter1615 archived-items-panel と同 pattern、iter1093-1615 sweep convention 着地)。
 *
 * 旧 sr-only caption text `(DnD で並び替え可能 / 列ヘッダ click で sort)` paren convention は
 * iter1093-1615 sweep の em-dash 区切と divergent。区切のみ '(' → ' — ' に統一、closing ')' は削除。
 *
 * 修正 (backlog-view.tsx):
 *   `バックログ一覧 (DnD で並び替え可能 / 列ヘッダ click で sort)` →
 *   `バックログ一覧 — DnD で並び替え可能 / 列ヘッダ click で sort`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-backlog-caption-em-dash-iter1616.ts
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
  const src = readFileSync(resolve(here, '../src/components/workspace/backlog-view.tsx'), 'utf8')

  if (!src.includes('バックログ一覧 — DnD で並び替え可能 / 列ヘッダ click で sort')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'backlog-view caption が em-dash 区切でない',
    })
  }
  if (src.includes('バックログ一覧 (DnD で並び替え可能 / 列ヘッダ click で sort)')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'backlog-view caption 旧 paren 区切が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — backlog-view caption が em-dash 区切')
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
