/**
 * Phase 6.15 loop iter2161: schedule-item-picker 検索結果 ul + item button title を aria-label と sync
 * (template-items-list iter2159 / backlog-title iter2157 と同 title=aria-label sync pattern)。
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

  const sp = readFileSync(
    resolve(here, '../src/components/schedule/schedule-item-picker.tsx'),
    'utf8',
  )
  const iter2161Count = (sp.match(/iter2161/g) ?? []).length
  if (iter2161Count < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `iter2161 marker 不足 (count=${iter2161Count}、ul + button 2 個必要)`,
    })
  }
  if (
    !sp.includes('title={`検索結果 — ${filtered.length} 件`}') ||
    !sp.includes("title={`${it.title} — item を選択${it.isMust ? ' (MUST)' : ''}`}")
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'schedule-picker title が aria-label と sync されていない',
    })
  }

  const ti = readFileSync(
    resolve(here, '../src/components/template/template-items-editor.tsx'),
    'utf8',
  )
  if (!ti.includes('iter2159')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2159 Template 子 Item 一覧 ul title 同期 が消えている',
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
    console.log('(なし) — schedule-picker title 同期、iter2159-1843 invariant 不変')
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
