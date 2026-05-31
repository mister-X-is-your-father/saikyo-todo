/**
 * Phase 6.15 loop iter1600: inbox-view GTD 分類 group landmark aria-label 先頭 colon を em-dash 区切に
 * migration (iter1093-1599 sweep convention 着地)。
 *
 * 旧 aria-label `"GTD 分類: 2 分以内 X 件、Project Y 件、次の action Z 件"` の 先頭 colon `:` は
 * iter1093-1599 sweep の em-dash 区切と divergent。`GTD 分類:` colon を ` — ` em-dash に統一
 * (内部の 、 separator は維持)。
 *
 * 修正 (inbox-view.tsx):
 *   `GTD 分類: 2 分以内 X 件、Project Y 件、次の action Z 件`
 *   → `GTD 分類 — 2 分以内 X 件、Project Y 件、次の action Z 件`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-inbox-gtd-group-em-dash-iter1600.ts
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

  if (!src.includes('aria-label={`GTD 分類 — 2 分以内 ${gtdSummary.counts.immediate} 件')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'inbox-view GTD 分類 group aria-label 先頭が em-dash 区切でない',
    })
  }
  if (src.includes('aria-label={`GTD 分類: 2 分以内 ${gtdSummary.counts.immediate} 件')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'inbox-view GTD 分類 group 旧 colon 区切 aria-label が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — inbox-view GTD 分類 group aria-label 先頭 em-dash 区切')
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
