/**
 * Phase 6.15 loop iter2229: workspace-header ヘッダー操作 group に title 付与し aria-label と sync
 * (workspace-header iter2227 と pair の header family 2 element 完成)。
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

  const wh = readFileSync(resolve(here, '../src/components/workspace/workspace-header.tsx'), 'utf8')
  if (
    !wh.includes('iter2229') ||
    !wh.includes('title={`${title} — ヘッダー操作 (ページ固有アクション / ユーティリティ)`}')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'workspace-header ヘッダー操作 group title が aria-label と sync されていない',
    })
  }
  if (!wh.includes('iter2227')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2227 workspace-header title 同期 が消えている',
    })
  }

  const mustBadge = readFileSync(
    resolve(here, '../src/components/workspace/must-badge.tsx'),
    'utf8',
  )
  if (!mustBadge.includes('title="MUST タスク"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1843 MustBadge title が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — workspace-header ヘッダー操作 group title 同期、header family 2 element 完成',
    )
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
