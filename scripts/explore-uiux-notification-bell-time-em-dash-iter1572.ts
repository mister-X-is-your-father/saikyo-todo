/**
 * Phase 6.15 loop iter1572: notification-bell entry time aria-label を em-dash 区切に migration
 * (iter1093-1571 sweep convention 着地)。
 *
 * 旧 aria-label `"${relative} (${iso})"` は visible "${relative}" は元から冒頭 (voice control OK)
 * だが区切が paren convention で iter1093-1571 sweep の em-dash と divergent。区切のみ '(' → ' — '
 * に統一、closing paren ')' は削除。
 *
 * 修正 (notification-bell.tsx):
 *   `${relative} (${iso})` → `${relative} — ${iso}`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-notification-bell-time-em-dash-iter1572.ts
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

  if (!src.includes('${formatRelativeTime(n.createdAt)} — ${n.createdAt instanceof Date')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'notification-bell entry time aria-label が em-dash 区切でない',
    })
  }
  if (src.includes('${formatRelativeTime(n.createdAt)} (${n.createdAt instanceof Date')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'notification-bell entry time 旧 paren 区切 aria-label が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — notification-bell entry time aria-label が em-dash 区切')
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
