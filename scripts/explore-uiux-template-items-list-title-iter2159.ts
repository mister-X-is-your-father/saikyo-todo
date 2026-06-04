/**
 * Phase 6.15 loop iter2159: Template 子 Item 一覧 ul に title 付与し aria-label と sync
 * (backlog-title iter2157 / inbox-item iter2155 と同 title=aria-label sync pattern)。
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

  const ti = readFileSync(
    resolve(here, '../src/components/template/template-items-editor.tsx'),
    'utf8',
  )
  if (
    !ti.includes('iter2159') ||
    !ti.includes('title={`Template 子 Item 一覧 — ${items.data!.length} 件`}')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'Template 子 Item 一覧 ul title が aria-label と sync されていない',
    })
  }

  const bv = readFileSync(resolve(here, '../src/components/workspace/backlog-view.tsx'), 'utf8')
  if (!bv.includes('iter2157')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2157 backlog-title button title 同期 が消えている',
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
    console.log('(なし) — Template 子 Item 一覧 ul title 付与、iter2157-1843 invariant 不変')
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
