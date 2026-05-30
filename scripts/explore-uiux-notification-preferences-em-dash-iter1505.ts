/**
 * Phase 6.15 loop iter1505: notification-preferences button aria-label を em-dash 統一
 * (regression guard、iter762 paren format からの migration)。
 *
 * iter762 で 動的 aria-label 追加時の paren convention `(メール通知 ${onCount}/${TOGGLES.length} 種 ON)`
 * がそのまま残存。iter1226 / iter1497 副 / iter1504 副 などの em-dash sweep からこぼれて
 * 残っていた。
 *
 * 修正 (notification-preferences.tsx):
 *   onCount path:    `通知設定 (メール通知 ${onCount}/${TOGGLES.length} 種 ON)`
 *                  → `通知設定 — メール通知 ${onCount}/${TOGGLES.length} 種 ON`
 *   fallback path:   `通知設定 (メール通知 4 種を ON/OFF)`
 *                  → `通知設定 — メール通知 4 種を ON/OFF`
 *
 * 連動更新 (scripts/explore-uiux-notification-preferences-button-iter762.ts):
 *   primary regex を () → em-dash に migration (検証目的 = 動的 onCount content 存在 guard で
 *   punctuation は本質的 invariant ではない)
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-notification-preferences-em-dash-iter1505.ts
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
  const filePath = resolve(here, '../src/components/workspace/notification-preferences.tsx')
  const src = readFileSync(filePath, 'utf8')

  if (!src.includes('`通知設定 — メール通知 ${onCount}/${TOGGLES.length} 種 ON`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'notification-preferences onCount path aria-label が em-dash 形式でない',
    })
  }
  if (src.includes('`通知設定 (メール通知 ${onCount}/${TOGGLES.length} 種 ON)`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'notification-preferences onCount path 旧 () 区切 aria-label が残存',
    })
  }
  if (!src.includes("'通知設定 — メール通知 4 種を ON/OFF'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'notification-preferences fallback path aria-label が em-dash 形式でない',
    })
  }
  if (src.includes("'通知設定 (メール通知 4 種を ON/OFF)'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'notification-preferences fallback path 旧 () 区切 aria-label が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — notification-preferences button 両 path aria-label が em-dash convention 統一済',
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
