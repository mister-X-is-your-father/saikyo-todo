/**
 * Phase 6.15 loop iter1222: active-timer-panel pause / resume / PiP icon-only button
 * aria-label visible-prefix regression guard。
 *
 * iter1222 で発見した visible-prefix 漏れ (BulkCheckbox iter1220 と同 sweep):
 * active-timer-panel.tsx の 3 icon-only button:
 *
 * 1. `active-timer-pause` 旧 aria-label "タイマーを一時停止" は概念名 "一時停止" を
 *    末尾に持ち voice control「click 一時停止」 prefix-match 不可。
 *
 * 2. `active-timer-resume` 同 pattern (旧 "タイマーを再開")。
 *
 * 3. `active-timer-pip` 4 path のうち default path "常に手前表示で別 window 化
 *    (Picture-in-Picture)" は概念名 "Picture-in-Picture" を末尾 () 内に持ち、voice control
 *    「click Picture-in-Picture」 prefix-match 不可 (他 3 path は既に冒頭 OK)。
 *
 * 修正 (active-timer-panel.tsx):
 * - pause: `一時停止 — タイマーを一時停止` で先頭固定
 * - resume: `再開 — タイマーを再開` で先頭固定
 * - pip default path: `Picture-in-Picture — 常に手前表示で別 window 化` で先頭固定
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-active-timer-pause-resume-pip-visible-prefix-iter1222.ts
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
  const filePath = resolve(here, '../src/components/workspace/active-timer-panel.tsx')
  const src = readFileSync(filePath, 'utf8')

  const expected = [
    'aria-label="一時停止 — タイマーを一時停止"',
    'aria-label="再開 — タイマーを再開"',
    "'Picture-in-Picture — 常に手前表示で別 window 化'",
  ]
  for (const e of expected) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `active-timer aria-label 新形式 欠落: ${e}`,
      })
    }
  }

  // 旧 prefix-less 形式が active code に残存していないこと (comment 除外)
  const activeCode = src
    .split('\n')
    .filter((l) => !/^\s*\/\//.test(l) && !/^\s*\*/.test(l))
    .join('\n')
  const oldForbidden = [
    'aria-label="タイマーを一時停止"',
    'aria-label="タイマーを再開"',
    "'常に手前表示で別 window 化 (Picture-in-Picture)'",
  ]
  for (const o of oldForbidden) {
    if (activeCode.includes(o)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `旧 prefix-less aria-label が active code に残存: ${o}`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — active-timer pause / resume / pip aria-label は visible 冒頭固定済')
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
