/**
 * Phase 6.15 loop iter1576: active-timer-panel region landmark aria-label を
 * paren convention から em-dash 区切に統一 (iter1093-1575 sweep convention 着地)。
 *
 * 旧 paren convention `"タスクタイマー (経過 ${X} 計測中|一時停止中)"` を em-dash 区切に統一。
 * visible "タスクタイマー" は元から冒頭 prefix (voice control OK)、区切のみ '(' → ' — ' に統一、
 * closing ')' は削除。iter1573 operation-board Card / iter1575 taskchute Card と同 pattern。
 *
 * 修正 (active-timer-panel.tsx):
 *   "タスクタイマー (経過 ${X} ${state})" → "タスクタイマー — 経過 ${X} ${state}"
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-active-timer-region-em-dash-iter1576.ts
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

  if (
    !src.includes(
      "aria-label={`タスクタイマー — 経過 ${formatElapsed(elapsedMs)}${running ? ' 計測中' : ' 一時停止中'}`}",
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'active-timer-panel region aria-label が em-dash 形式でない',
    })
  }
  if (
    src.includes(
      "aria-label={`タスクタイマー (経過 ${formatElapsed(elapsedMs)}${running ? ' 計測中' : ' 一時停止中'})`}",
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 paren convention aria-label が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — active-timer-panel region aria-label が em-dash 形式')
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
