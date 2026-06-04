/**
 * Phase 6.15 loop iter2301: assignee-picker / tag-picker trigger button の empty 時にも
 * title 付与 (iter1743/1744 は non-empty 時のみ title だったが、empty 時の "アサインを選択" /
 * "タグを選択" 操作 hint が sighted hover で disclose 不可だった)、両 path で aria-label と
 * title 同 text sync、MCP path A 経由発見。
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

  const ap = readFileSync(resolve(here, '../src/components/workspace/assignee-picker.tsx'), 'utf8')
  if (!ap.includes('iter2301') || !ap.includes("'未アサイン — アサインを選択 (現在未アサイン)'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'assignee-picker trigger empty title が aria-label と sync されていない',
    })
  }
  // empty path aria-label + title 計 2 出現
  const assigneeEmpty = (ap.match(/'未アサイン — アサインを選択 \(現在未アサイン\)'/g) || []).length
  if (assigneeEmpty < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `assignee-picker empty 出現 ${assigneeEmpty} 回、aria-label + title 計 2 回必要`,
    })
  }
  // 旧 `title={selectedLabels.length > 0 ? selectedLabels.join(', ') : undefined}` が消えていること
  if (ap.includes("title={selectedLabels.length > 0 ? selectedLabels.join(', ') : undefined}")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 assignee-picker partial title pattern が残っている',
    })
  }

  const tp = readFileSync(resolve(here, '../src/components/workspace/tag-picker.tsx'), 'utf8')
  if (!tp.includes('iter2301') || !tp.includes("'タグなし — タグを選択 (現在なし)'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'tag-picker trigger empty title が aria-label と sync されていない',
    })
  }
  const tagEmpty = (tp.match(/'タグなし — タグを選択 \(現在なし\)'/g) || []).length
  if (tagEmpty < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `tag-picker empty 出現 ${tagEmpty} 回、aria-label + title 計 2 回必要`,
    })
  }

  const ed = readFileSync(resolve(here, '../src/components/workspace/item-edit-dialog.tsx'), 'utf8')
  if (!ed.includes('iter2299') || !ed.includes('iter2297')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2297/2299 item-edit-dialog title 系列が消えている',
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
      '(なし) — assignee-picker / tag-picker trigger 両 path title sync 完了、select hint が empty 時も hover disclose (MCP path A 経由発見)',
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
