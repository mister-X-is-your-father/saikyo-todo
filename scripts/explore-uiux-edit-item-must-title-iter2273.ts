/**
 * Phase 6.15 loop iter2273: edit-item-must checkbox に title 付与し aria-label
 * state-dependent 2-path と sync (theme-toggle iter1971 と同 state-dependent toggle
 * pattern を MUST checkbox にも展開、MCP path A 経由発見)。
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
  if (!ed.includes('iter2273')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'item-edit-dialog iter2273 marker が無い',
    })
  }
  // 2-path text aria-label + title 計 2 出現
  const onText = (ed.match(/MUST が ON: 絶対落とさない — DoD 必須、クリックで OFF/g) || []).length
  if (onText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `edit-item-must ON 出現 ${onText} 回、aria-label + title 計 2 回必要`,
    })
  }
  const offText = (ed.match(/MUST が OFF: 通常タスク — クリックで ON、DoD 必須化/g) || []).length
  if (offText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `edit-item-must OFF 出現 ${offText} 回、aria-label + title 計 2 回必要`,
    })
  }

  const stb = readFileSync(
    resolve(here, '../src/components/workspace/start-timer-button.tsx'),
    'utf8',
  )
  if (!stb.includes('iter2271')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2271 start-timer-button title が消えている',
    })
  }

  const qa = readFileSync(resolve(here, '../src/components/workspace/quick-add.tsx'), 'utf8')
  if (!qa.includes('iter2269')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2269 QuickAdd preview title が消えている',
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
      '(なし) — edit-item-must title 2-path sync 完了、MUST checkbox toggle title pattern 展開 (MCP path A 経由発見)',
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
