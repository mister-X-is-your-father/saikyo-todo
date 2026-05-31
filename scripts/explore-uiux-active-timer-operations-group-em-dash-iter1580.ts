/**
 * Phase 6.15 loop iter1580: active-timer-panel timer operations group aria-label を
 * paren convention から em-dash 区切に統一 (iter1093-1579 sweep convention 着地)。
 *
 * 旧 paren convention `"タスクタイマーの操作 (現在: ${state}、一時停止 / 再開 / PiP / 停止)"` を
 * em-dash 区切に統一。iter1578 sprint operations / iter1579 goal operations と同 pattern。
 *
 * 修正 (active-timer-panel.tsx):
 *   "タスクタイマーの操作 (現在: ${state}、...)" → "タスクタイマーの操作 — 現在 ${state}、..."
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-active-timer-operations-group-em-dash-iter1580.ts
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
  const src = readFileSync(
    resolve(here, '../src/components/workspace/active-timer-panel.tsx'),
    'utf8',
  )

  if (!src.includes('タスクタイマーの操作 — 現在 ')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'active-timer operations group aria-label が em-dash 形式でない',
    })
  }
  if (src.includes('タスクタイマーの操作 (現在: ')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 paren convention aria-label が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — active-timer operations group が em-dash 形式')
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
