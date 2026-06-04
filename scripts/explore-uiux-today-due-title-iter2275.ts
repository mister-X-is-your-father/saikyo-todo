/**
 * Phase 6.15 loop iter2275: today-view 期限 span に title 付与し aria-label と sync
 * (visible は friendly date のみで literal ISO は SR にしか届かなかった、MCP path A
 * 経由発見、cross-view 期限 span title 統一)。
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

  const tv = readFileSync(resolve(here, '../src/components/workspace/today-view.tsx'), 'utf8')
  if (!tv.includes('iter2275') || !tv.includes('title={`期限 ${it.dueDate}`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'today-view 期限 span title が aria-label と sync されていない',
    })
  }
  // aria-label + title 計 2 出現
  const dueText = (tv.match(/`期限 \$\{it\.dueDate\}`/g) || []).length
  if (dueText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `today 期限 span text 出現 ${dueText} 回、aria-label + title 計 2 回必要`,
    })
  }

  const ed = readFileSync(resolve(here, '../src/components/workspace/item-edit-dialog.tsx'), 'utf8')
  if (!ed.includes('iter2273')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2273 edit-item-must title が消えている',
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
      '(なし) — today-view 期限 span title sync 完了、cross-view 期限 span title 統一 (MCP path A 経由発見)',
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
