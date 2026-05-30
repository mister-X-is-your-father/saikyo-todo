/**
 * Phase 6.15 loop iter1497: notification-bell.tsx PopoverTrigger Button aria-label を
 * em-dash 統一 (regression guard)。
 *
 * iter1093-1496 em-dash sweep で codebase 全体の visible-prefix button aria-label を
 * em-dash 区切に統一済だが、notification-bell trigger button は `'通知 (未読 ${unreadCount} 件)'`
 * の旧 () 区切が残存していた。icon-only button (Bell + badge は aria-hidden) で accessible
 * name = aria-label の値。voice control「click 通知」 は prefix match で維持されるが、
 * 区切 punctuation が他 surface (calendar-view nav / items-board view-switcher / operation-board) と
 * 不一致で SR 出力 mental model が混在。
 *
 * 修正 (notification-bell.tsx):
 *   aria-label={`通知 (未読 ${unreadCount} 件)`}
 * → aria-label={`通知 — 未読 ${unreadCount} 件`}
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-notification-bell-em-dash-iter1497.ts
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
  const filePath = resolve(here, '../src/components/workspace/notification-bell.tsx')
  const src = readFileSync(filePath, 'utf8')

  if (!src.includes('aria-label={`通知 — 未読 ${unreadCount} 件`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'notification-bell aria-label が em-dash 形式 "通知 — 未読 ..." でない',
    })
  }
  if (src.includes('aria-label={`通知 (未読 ${unreadCount} 件)`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'notification-bell 旧 () 区切 aria-label が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — notification-bell button aria-label が em-dash convention 統一済')
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
