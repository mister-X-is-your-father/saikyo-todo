/**
 * Phase 6.15 loop iter1567: today-view 期限時刻 chip aria-label を visible 冒頭
 * em-dash 形式に migration (iter1093-1566 sweep convention 着地)。
 *
 * 旧 aria-label `"期限時刻 ${HH:MM}"` は visible (= "HH:MM" のみ、iter1057 で aria-hidden span)
 * を末尾に持ち voice control prefix-matching「click HH:MM」 が strict prefix-match で不可。
 * iter1093-1566 sweep convention で visible 冒頭固定 + em-dash 区切。
 *
 * 修正 (today-view.tsx):
 *   "期限時刻 ${it.dueTime.slice(0, 5)}" → "${it.dueTime.slice(0, 5)} — 期限時刻"
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-today-due-time-em-dash-iter1567.ts
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
  const src = readFileSync(resolve(here, '../src/components/workspace/today-view.tsx'), 'utf8')

  if (!src.includes('aria-label={`${it.dueTime.slice(0, 5)} — 期限時刻`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'today-view 期限時刻 chip aria-label が em-dash 形式でない',
    })
  }
  if (src.includes('aria-label={`期限時刻 ${it.dueTime.slice(0, 5)}`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'today-view 期限時刻 旧 visible 末尾形式 aria-label が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — today-view 期限時刻 chip aria-label が em-dash 形式')
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
