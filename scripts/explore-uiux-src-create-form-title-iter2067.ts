/**
 * Phase 6.15 loop iter2067: External Source 作成フォーム に title 付与
 * (10 form family 完成: 3 create + 3 edit + mock-login + mock-submit + cte + src-create)。
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

  const integ = readFileSync(
    resolve(here, '../src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (!integ.includes('title="External Source 作成フォーム"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'External Source 作成フォーム title が無い',
    })
  }

  const cte = readFileSync(
    resolve(here, '../src/components/time-entry/create-time-entry-form.tsx'),
    'utf8',
  )
  if (!cte.includes('title="稼働記録 作成フォーム"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2065 cte-form title が消えている',
    })
  }

  const today = readFileSync(resolve(here, '../src/components/workspace/today-view.tsx'), 'utf8')
  if (!today.includes('title={`${it.dueTime.slice(0, 5)} — 期限時刻`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1875 today dueTime title が消えている',
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
    console.log('(なし) — External Source 作成フォーム title 付与、iter2065-1777 invariant 不変')
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
