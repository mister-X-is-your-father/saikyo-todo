/**
 * Phase 6.15 loop iter1529: status-visual.ts STATUS_MAP (5 status + UNKNOWN) に dark variant
 * を補完 (mode-D contrast、iter1376/1493/1512-1528 chip dark sweep の central feature 着地)。
 *
 * STATUS_MAP は Item.status (todo/in_progress/done/cancelled/blocked + unknown fallback) を
 * StatusBadge component が描画する時に使う graphical config を提供する central feature。
 * 6 config 全てが `bg-{color}-100 text-{color}-{700,800} ring-{color}-{200,300}` で light 固定、
 * iter1376/1493/1512-1528 chip dark sweep からこぼれていた。
 *
 * 修正 (status-visual.ts):
 *   各 config に dark token 併記:
 *     bgClass: + `dark:bg-{color}-{900-950}/40`
 *     textClass: + `dark:text-{color}-{200-400}`
 *     ringClass: + `dark:ring-{color}-{700-900}/50`
 *
 * 影響範囲: StatusBadge component を import している全 caller (today/inbox/backlog/personal-
 * period/dashboard/subtasks/decompose-proposals/template/etc) で status 表示が dark mode 対応。
 *
 * test invariant (status-visual.test.ts):
 *   既存 test は `toContain('slate')` など substring check 形式で、dark variant 追加でも
 *   pass する (= test 改修不要)。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-status-visual-dark-iter1529.ts
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
  const src = readFileSync(resolve(here, '../src/features/item/status-visual.ts'), 'utf8')

  const checks: Array<[string, string]> = [
    ['UNKNOWN bg', "bgClass: 'bg-zinc-100 dark:bg-zinc-900/40'"],
    ['UNKNOWN text', "textClass: 'text-zinc-700 dark:text-zinc-300'"],
    ['todo bg', "bgClass: 'bg-slate-100 dark:bg-slate-900/40'"],
    ['todo text', "textClass: 'text-slate-700 dark:text-slate-300'"],
    ['in_progress bg', "bgClass: 'bg-blue-100 dark:bg-blue-950/40'"],
    ['in_progress text', "textClass: 'text-blue-700 dark:text-blue-300'"],
    ['done bg', "bgClass: 'bg-emerald-100 dark:bg-emerald-950/40'"],
    ['done text', "textClass: 'text-emerald-700 dark:text-emerald-300'"],
    ['cancelled bg', "bgClass: 'bg-zinc-100 dark:bg-zinc-900/40'"],
    ['cancelled text line-through', "textClass: 'text-zinc-700 dark:text-zinc-400 line-through'"],
    ['blocked bg', "bgClass: 'bg-amber-100 dark:bg-amber-950/40'"],
    ['blocked text', "textClass: 'text-amber-800 dark:text-amber-200'"],
  ]
  for (const [name, expected] of checks) {
    if (!src.includes(expected)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `status-visual.ts ${name} に dark variant が無い`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — status-visual.ts STATUS_MAP 5 status + UNKNOWN に dark variant 補完済')
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
