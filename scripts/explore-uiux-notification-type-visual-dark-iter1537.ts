/**
 * Phase 6.15 loop iter1537: features/notification/type-visual.ts TYPE_MAP 4 type + UNKNOWN
 * に dark variant を補完 (mode-D contrast、iter1376/1493/1512-1536 chip dark sweep の
 * central feature 着地)。
 *
 * type-visual.ts は notification-bell row で各通知の type (heartbeat/mention/invite/
 * sync-failure + unknown) を icon + 配色で先頭描画する graphical config を提供。5 visual
 * 全てが `bg-{color}-100 text-{color}-{600,700} ring-{color}-200` で light 固定、
 * iter1376/1493/1512-1536 chip dark sweep からこぼれていた。
 *
 * 修正 (type-visual.ts):
 *   各 config に dark token 併記:
 *     bgClass: + `dark:bg-{color}-{900-950}/40`
 *     textClass: + `dark:text-{color}-{300,400}`
 *     ringClass: + `dark:ring-{color}-{700-900}/50`
 *
 * 影響範囲: notification-bell row 描画 + 通知 popover で各通知 type 配色が dark mode 対応化。
 *
 * test invariant (type-visual.test.ts、8 ケース):
 *   `.toContain('red')` 形式の substring check で dark variant 追加に透過、全 pass 確認。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-notification-type-visual-dark-iter1537.ts
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
  const src = readFileSync(resolve(here, '../src/features/notification/type-visual.ts'), 'utf8')

  const checks: Array<[string, string]> = [
    ['UNKNOWN bg', "bgClass: 'bg-zinc-100 dark:bg-zinc-900/40'"],
    ['UNKNOWN text', "textClass: 'text-zinc-600 dark:text-zinc-400'"],
    ['heartbeat bg', "bgClass: 'bg-red-100 dark:bg-red-950/40'"],
    ['heartbeat text', "textClass: 'text-red-700 dark:text-red-300'"],
    ['mention bg', "bgClass: 'bg-blue-100 dark:bg-blue-950/40'"],
    ['mention text', "textClass: 'text-blue-700 dark:text-blue-300'"],
    ['invite bg', "bgClass: 'bg-emerald-100 dark:bg-emerald-950/40'"],
    ['invite text', "textClass: 'text-emerald-700 dark:text-emerald-300'"],
    ['sync-failure bg', "bgClass: 'bg-amber-100 dark:bg-amber-950/40'"],
    ['sync-failure text', "textClass: 'text-amber-700 dark:text-amber-300'"],
  ]
  for (const [name, expected] of checks) {
    if (!src.includes(expected)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `type-visual.ts ${name} に dark variant が無い`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — type-visual.ts TYPE_MAP 4 type + UNKNOWN に dark variant 補完済')
  } else {
    for (const f of findings) console.log(`  [${f.level}/${f.source}] ${f.message}`)
  }
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.filter((f) => f.level === 'error').length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
