/**
 * Phase 6.15 loop iter1612: taskchute-view time slot aria-label を visible 冒頭 em-dash 形式に
 * migration (iter1604 ETA + iter1605 quick-add + iter1610/1611 calibrated と同 pattern、
 * iter1553-1611 visible 冒頭 em-dash sweep convention 着地、WCAG 2.5.3 fix)。
 *
 * 旧 aria-label `"予定時刻 ${timeLabel}"` (timeLabel ありの path) は visible "${timeLabel}" を末尾に
 * 持ち voice control prefix-matching「click HH:MM」 が strict prefix-match で不可。null path
 * (`'時刻未指定'`) は visible "--:--" のみで text-prefix 無、維持。
 *
 * 修正 (taskchute-view.tsx):
 *   ありの path: `予定時刻 ${timeLabel}` → `${timeLabel} — 予定時刻`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-taskchute-time-slot-em-dash-iter1612.ts
 * 前提: なし (source 直読 invariant)
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
  const src = readFileSync(resolve(here, '../src/components/workspace/taskchute-view.tsx'), 'utf8')

  if (!src.includes('timeLabel ? `${timeLabel} — 予定時刻` :')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'taskchute time slot aria-label が em-dash 形式 (visible 冒頭) でない',
    })
  }
  if (src.includes('timeLabel ? `予定時刻 ${timeLabel}` :')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'taskchute time slot 旧 aria-label (visible 末尾) が残存',
    })
  }
  // null path 維持確認
  if (!src.includes("'時刻未指定'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'taskchute time slot null path aria-label が消失',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — taskchute time slot aria-label が em-dash 形式 (visible 冒頭固定)')
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
