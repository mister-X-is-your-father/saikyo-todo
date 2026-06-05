/**
 * Phase 6.15 loop iter2323: gantt-show-deps-toggle checkbox に title 付与し
 * aria-label state-dependent 2-path (showDeps ? '表示中 — クリックで非表示'
 * : 'クリックで表示') と sync。done-yesterday-toggle iter2311 /
 * activity-detail-toggle iter2293 と同 disclosure toggle title pattern を
 * gantt 依存線 toggle にも展開。
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

  const gantt = readFileSync(resolve(here, '../src/components/workspace/gantt-view.tsx'), 'utf8')
  if (!gantt.includes('iter2323')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'gantt-show-deps-toggle iter2323 marker が無い',
    })
  }
  // 2-path 各 text aria-label + title 計 2 出現
  const onText = (gantt.match(/'依存線を表示中 — クリックで非表示'/g) || []).length
  if (onText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `gantt-show-deps showDeps=true 出現 ${onText} 回、aria-label + title 計 2 回必要`,
    })
  }
  const offText = (gantt.match(/'依存線 — クリックで表示'/g) || []).length
  if (offText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `gantt-show-deps showDeps=false 出現 ${offText} 回、aria-label + title 計 2 回必要`,
    })
  }

  // iter2321 regression guard (前 iter)
  const pg = readFileSync(
    resolve(here, '../src/components/workspace/item-plan-generate-button.tsx'),
    'utf8',
  )
  if (!pg.includes('iter2321')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2321 item-plan-generate-button title が消えている',
    })
  }

  const ic = readFileSync(resolve(here, '../src/components/workspace/item-checkbox.tsx'), 'utf8')
  if (!ic.includes('iter2319')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2319 item-checkbox title が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — gantt-show-deps-toggle title 2-path sync 完了、依存線 toggle が sighted hover で disclose 可能',
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
