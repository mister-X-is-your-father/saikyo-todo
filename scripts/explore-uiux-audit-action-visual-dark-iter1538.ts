/**
 * Phase 6.15 loop iter1538: features/audit/action-visual.ts 7 audit action visual に dark
 * variant を補完 (mode-D contrast、iter1376/1493/1512-1537 chip dark sweep の central feature
 * 6 件目)。
 *
 * action-visual.ts は ActivityLog row で各 audit action (create/update/transition/complete/
 * reopen/delete + unknown) を icon + 配色で先頭描画する graphical config を提供する central
 * feature。7 visual 全てが `bg-{color}-100 text-{color}-{600,700} ring-{color}-200` で
 * light 固定、iter1376/1493/1512-1537 chip dark sweep の central feature 6 件目着地。
 *
 * 修正 (action-visual.ts):
 *   各 visual に dark token 併記 (notification iter1537 と同 pattern):
 *     bgClass: + dark:bg-{color}-{900-950}/40
 *     textClass: + dark:text-{color}-{300,400}
 *     ringClass: + dark:ring-{color}-{700-900}/50
 *
 * 影響範囲: ActivityLog 全 row の action chip 配色が dark mode 対応化。
 *
 * test invariant (action-visual.test.ts、12 ケース):
 *   `.toContain('emerald')` 形式の substring check で dark variant 追加に透過、全 pass 確認。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-audit-action-visual-dark-iter1538.ts
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
  const src = readFileSync(resolve(here, '../src/features/audit/action-visual.ts'), 'utf8')

  const checks: Array<[string, string]> = [
    ['UNKNOWN', "bgClass: 'bg-zinc-100 dark:bg-zinc-900/40'"],
    ['CREATE', "bgClass: 'bg-emerald-100 dark:bg-emerald-950/40'"],
    ['UPDATE', "bgClass: 'bg-blue-100 dark:bg-blue-950/40'"],
    ['TRANSITION', "bgClass: 'bg-amber-100 dark:bg-amber-950/40'"],
    ['COMPLETE', "bgClass: 'bg-emerald-100 dark:bg-emerald-950/40'"], // 同 emerald variant
    ['REOPEN', "bgClass: 'bg-slate-100 dark:bg-slate-900/40'"],
    ['DELETE', "bgClass: 'bg-red-100 dark:bg-red-950/40'"],
  ]
  for (const [name, expected] of checks) {
    if (!src.includes(expected)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `action-visual.ts ${name}_VISUAL bgClass に dark variant が無い`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — action-visual.ts 7 audit action visual に dark variant 補完済')
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
