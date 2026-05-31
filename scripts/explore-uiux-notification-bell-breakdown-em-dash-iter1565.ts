/**
 * Phase 6.15 loop iter1565: notification-bell breakdown chip aria-label を
 * visible 冒頭 em-dash 形式に migration (iter1093-1564 sweep convention 着地)。
 *
 * 旧 aria-label `"未読内訳: ${unreadBreakdown}"` は ':' colon 区切で visible
 * "${unreadBreakdown}" を末尾に持ち voice control prefix-matching 不可。iter1561 同 file 内
 * hint chip と同 pattern、visible 冒頭固定 + em-dash 区切。
 *
 * 修正 (notification-bell.tsx):
 *   "未読内訳: ${unreadBreakdown}" → "${unreadBreakdown} — 未読内訳"
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-notification-bell-breakdown-em-dash-iter1565.ts
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
    resolve(here, '../src/components/workspace/notification-bell.tsx'),
    'utf8',
  )

  if (!src.includes('aria-label={`${unreadBreakdown} — 未読内訳`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'notification-bell breakdown aria-label が em-dash 形式でない',
    })
  }
  if (src.includes('aria-label={`未読内訳: ${unreadBreakdown}`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'notification-bell breakdown 旧 colon 形式 aria-label が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — notification-bell breakdown chip aria-label が em-dash 形式')
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
