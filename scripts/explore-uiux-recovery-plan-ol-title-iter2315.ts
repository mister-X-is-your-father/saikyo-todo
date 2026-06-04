/**
 * Phase 6.15 loop iter2315: recovery-plan-section の 救済 action ol に title 付与し
 * aria-label と sync (Activity 履歴 ul iter2291 と同 list family、8 entity 一覧 list family
 * 完成)。
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

  const rp = readFileSync(resolve(here, '../src/components/item/recovery-plan-section.tsx'), 'utf8')
  if (!rp.includes('iter2315') || !rp.includes('title={`救済 action ${plan.actions.length} 件`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'recovery-plan ol title が aria-label と sync されていない',
    })
  }
  const recoveryText = (rp.match(/`救済 action \$\{plan\.actions\.length\} 件`/g) || []).length
  if (recoveryText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `recovery-plan ol 出現 ${recoveryText} 回、aria-label + title 計 2 回必要`,
    })
  }

  const ip = readFileSync(
    resolve(here, '../src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (!ip.includes('iter2313')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2313 src-url input title が消えている',
    })
  }

  const al = readFileSync(resolve(here, '../src/components/workspace/activity-log.tsx'), 'utf8')
  if (!al.includes('iter2291')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2291 Activity 履歴 ul title が消えている',
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
      '(なし) — recovery-plan ol title sync 完了、8 entity 一覧 list family 完成 (+ recovery actions)',
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
