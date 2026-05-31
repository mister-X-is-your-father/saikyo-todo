/**
 * Phase 6.15 loop iter1592: inbox-view region landmark aria-label を
 * paren convention から em-dash 区切に統一 (iter1093-1591 sweep convention 着地)。
 *
 * 修正 (inbox-view.tsx):
 *   "Inbox view (X 件、scheduledFor も期限も未設定、健全性: Y)"
 *   → "Inbox view — X 件、scheduledFor も期限も未設定、健全性 Y"
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-inbox-view-region-em-dash-iter1592.ts
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
  const src = readFileSync(resolve(here, '../src/components/workspace/inbox-view.tsx'), 'utf8')

  if (!src.includes('Inbox view — ${inbox.length} 件、')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'inbox-view region aria-label が em-dash 形式でない',
    })
  }
  if (src.includes('Inbox view (${inbox.length} 件、')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 paren convention 残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — inbox-view region が em-dash 形式')
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
