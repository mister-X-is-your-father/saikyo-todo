/**
 * Phase 6.15 loop iter1573: subtasks-panel sortable li の focus-within ring に
 * dark variant を補完。
 *
 * `focus-within:ring-blue-200` は light 固定で dark mode で ring-blue-200 (very-light blue)
 * は dark bg 上で blowout、focus indicator が潰れる。iter1493/1512-1571 ring dark sweep と
 * 同 pattern + iter1548 step number ring と同 file 内の別 ring 漏れ。`dark:focus-within:ring-blue-700`
 * (= darker) で contrast 整合。
 *
 * 修正 (subtasks-panel.tsx):
 *   focus-within:ring-blue-200
 *   → focus-within:ring-blue-200 dark:focus-within:ring-blue-700
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-subtasks-focus-ring-dark-iter1573.ts
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
  const src = readFileSync(resolve(here, '../src/components/workspace/subtasks-panel.tsx'), 'utf8')

  if (!src.includes('focus-within:ring-blue-200 dark:focus-within:ring-blue-700')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'subtasks-panel li focus-within ring に dark variant が無い',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — subtasks-panel li focus-within ring に dark variant 補完済')
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
