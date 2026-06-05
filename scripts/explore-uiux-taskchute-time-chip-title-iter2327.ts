/**
 * Phase 6.15 loop iter2327: taskchute timeline 各 row の 予定時刻 chip に title
 * 付与し aria-label state-dependent 2-path (timeLabel 有 → "HH:MM — 予定時刻"
 * / 無 → "時刻未指定") と sync。active-timer-calibrated iter1851 / quick-add-
 * calibrated iter1889 と同 role=img chip title pattern を taskchute time chip
 * にも展開。
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

  const tc = readFileSync(resolve(here, '../src/components/workspace/taskchute-view.tsx'), 'utf8')
  if (!tc.includes('iter2327')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'taskchute-view iter2327 marker が無い',
    })
  }
  // 2-path: timeLabel ありの aria + title 計 2 出現
  const withLabel = (tc.match(/timeLabel \? `\$\{timeLabel\} — 予定時刻` : '時刻未指定'/g) || [])
    .length
  if (withLabel < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `taskchute time chip 2-path expression 出現 ${withLabel} 回、aria-label + title 計 2 回必要`,
    })
  }

  // 既存 regression guard
  if (!tc.includes('iter2181')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2181 taskchute ol title が消えている',
    })
  }

  // iter2325 regression guard
  const gantt = readFileSync(resolve(here, '../src/components/workspace/gantt-view.tsx'), 'utf8')
  if (!gantt.includes('iter2325') || !gantt.includes('iter2323')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2323/2325 gantt toggle title が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — taskchute time chip title 2-path sync 完了、sighted hover で 時刻未指定 / 予定時刻 disclose 可能',
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
