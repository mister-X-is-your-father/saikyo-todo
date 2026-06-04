/**
 * Phase 6.15 loop iter2251: tag-picker / assignee-picker の PopoverContent に
 * title 付与し aria-label と sync (picker family 2 element PopoverContent title 完成)。
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

  const tp = readFileSync(resolve(here, '../src/components/workspace/tag-picker.tsx'), 'utf8')
  if (!tp.includes('iter2251') || !tp.includes('title="タグ — 選択 / 新規作成"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'tag-picker PopoverContent title が aria-label と sync されていない',
    })
  }

  const ap = readFileSync(resolve(here, '../src/components/workspace/assignee-picker.tsx'), 'utf8')
  if (!ap.includes('iter2251') || !ap.includes('title="アサイン — メンバー / AI Agent を選択"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'assignee-picker PopoverContent title が aria-label と sync されていない',
    })
  }

  const tv = readFileSync(resolve(here, '../src/components/workspace/today-view.tsx'), 'utf8')
  if (!tv.includes('iter2249')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2249 today-view header chips title が消えている',
    })
  }

  const gv = readFileSync(resolve(here, '../src/components/workspace/gantt-view.tsx'), 'utf8')
  if (!gv.includes('iter2247')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2247 gantt-view root title が消えている',
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
    console.log('(なし) — picker family PopoverContent 2 element title sync 完了 (tag / assignee)')
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
