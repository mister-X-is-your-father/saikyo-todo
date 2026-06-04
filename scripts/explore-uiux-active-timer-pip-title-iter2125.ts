/**
 * Phase 6.15 loop iter2125: active-timer-pip button title を aria-label と 4-path sync
 * (budget-edit-btn iter2123 / item-edit-set-baseline iter2121 と同 title-aria
 *  divergence 修正 pattern、4-path format + count 統一)。
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

  const atp = readFileSync(
    resolve(here, '../src/components/workspace/active-timer-panel.tsx'),
    'utf8',
  )
  if (!atp.includes('iter2125') || !atp.includes("'Picture-in-Picture — 開いています…'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'active-timer-pip title が aria-label と 4-path divergent',
    })
  }
  // 旧 静的 title (3-path、Picture-in-Picture prefix 不在) が残っていないこと
  if (/'PiP を閉じる'/.test(atp)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'active-timer-pip 旧 3-path title が残っている',
    })
  }

  const bp = readFileSync(resolve(here, '../src/components/workspace/budget-panel.tsx'), 'utf8')
  if (!bp.includes('iter2123')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2123 budget-edit-btn title 同期 が消えている',
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
    console.log('(なし) — active-timer-pip title 4-path 同期、iter2123-1843 invariant 不変')
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
