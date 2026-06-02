/**
 * Phase 6.15 loop iter1697: backlog-view sortable <th> aria-label の visible-prefix
 * convention に合わせ「」 quote を削除。
 *
 * iter1147 (`item「title」を選択` → `${title} — item を選択`) と同 fix を backlog
 * sortable header にも展開。voice control prefix-matching「click <headerName>」 は
 * accessible name (aria-label) の strict prefix match で動くため、aria-label が
 * `「${headerName}」...` 形式だと先頭が `「` で visible header text が pos 2 にあり
 * 不一致になる。
 *
 * 旧: `「${headerName}」列でソート (現在: ${sortLabel}) — Enter / Space で次の状態に切替`
 * 新: `${headerName} 列でソート (現在: ${sortLabel}) — Enter / Space で次の状態に切替`
 *
 * 実行: pnpm tsx scripts/explore-uiux-backlog-sort-visible-prefix-iter1697.ts
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

  const view = readFileSync(resolve(here, '../src/components/workspace/backlog-view.tsx'), 'utf8')

  // 1. 旧「」 quote prefix が消失
  if (view.includes('「${headerName}」列でソート')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'backlog-view sortable <th> aria-label に旧「」 quote prefix が残存',
    })
  }

  // 2. 新 visible-prefix が存在
  if (!view.includes('${headerName} 列でソート (現在: ${sortLabel})')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'backlog-view sortable <th> aria-label に visible-prefix convention が無い',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — backlog-view sort header aria-label が visible-prefix convention')
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
