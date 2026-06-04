/**
 * Phase 6.15 loop iter2299: editStart / editDue date input 2 element に title 付与し
 * aria-label state-dependent 3-path と sync (editTitle iter2295 / editDescription iter2297
 * と同 input title pattern を date input にも展開、MCP path A 経由発見)。
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

  const ed = readFileSync(resolve(here, '../src/components/workspace/item-edit-dialog.tsx'), 'utf8')
  if (!ed.includes('iter2299')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'item-edit-dialog iter2299 marker が無い',
    })
  }
  // editStart 3-path 各 text aria-label + title 計 2 出現
  const startEmpty = (ed.match(/開始日 \(任意、期限以前\)/g) || []).length
  if (startEmpty < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `editStart empty 出現 ${startEmpty} 回、aria-label + title 計 2 回必要`,
    })
  }
  // editDue 3-path 各 text aria-label + title 計 2 出現
  const dueEmpty = (
    ed.match(/期限 \(任意、開始日以降、MUST item は期限 \+ Heartbeat 通知が必須\)/g) || []
  ).length
  if (dueEmpty < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `editDue empty 出現 ${dueEmpty} 回、aria-label + title 計 2 回必要`,
    })
  }
  if (!ed.includes('iter2297') || !ed.includes('iter2295')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2295/2297 input title 系列が消えている',
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
      '(なし) — editStart / editDue 2 date input title 3-path sync 完了 (MCP path A 経由発見)',
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
