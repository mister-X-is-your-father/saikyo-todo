/**
 * Phase 6.15 loop iter1541: inbox-view item row aria-label を em-dash 形式に migration
 * (iter1093-1540 sweep convention 着地)。
 *
 * 旧 aria-label `${it.title} を編集ダイアログで開く` は visible-prefix ${it.title} を満たすが
 * ' を' 助詞接続で iter1093-1540 sweep の em-dash 区切と divergent。
 *
 * 修正 (inbox-view.tsx):
 *   aria-label={`${it.title} を編集ダイアログで開く`}
 * → aria-label={`${it.title} — 編集ダイアログで開く`}
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-inbox-row-em-dash-iter1541.ts
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

  if (!src.includes('aria-label={`${it.title} — 編集ダイアログで開く`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'inbox-view item row aria-label が em-dash 形式 "${title} — 編集..." でない',
    })
  }
  if (src.includes('aria-label={`${it.title} を編集ダイアログで開く`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'inbox-view item row 旧 aria-label "${title} を編集ダイアログで開く" が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — inbox-view item row aria-label が em-dash convention 統一済')
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
