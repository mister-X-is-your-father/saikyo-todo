/**
 * Phase 6.15 loop iter1517 (mode-D = chip dark variant補完 sweep continuation):
 * estimate-bias-insight.tsx の TENDENCY_TONE 4 chip (on-track/underestimating/
 * overestimating/mixed) は light 固定で dark mode で明色 box が浮く。
 *
 * Bug: src/components/time-entry/estimate-bias-insight.tsx の TENDENCY_TONE
 * Record (line 43-49) は tendency 4 種 + unknown を mapping:
 *   on-track:       'bg-emerald-50 text-emerald-700 border-emerald-200'
 *   underestimating: 'bg-amber-50   text-amber-700   border-amber-200'
 *   overestimating:  'bg-sky-50     text-sky-700     border-sky-200'
 *   mixed:           'bg-violet-50  text-violet-700  border-violet-200'
 * 全 4 tone が light 固定 chip で dark mode で明色 box が浮く。iter1376/1493/
 * 1512/1513 副/1515/1516 で確立済の dark chip token pattern を本 4 tone にも
 * 一括展開。unknown は theme-aware (`bg-muted text-foreground border-border`) で
 * touch なし。
 *
 * 修正: 4 tone に `dark:bg-{color}-950/30 dark:text-{color}-300
 * dark:border-{color}-900/50` を併記 (iter1515 / iter1516 同 pattern)。
 *
 * 経路 B: source-side regex assert + iter1516 calibrated chip / iter1514 副
 * calendar lane invariant cross-check。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-estimate-bias-tendency-tone-dark-iter1517.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

function main(): void {
  const findings: Finding[] = []

  const ebi = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/estimate-bias-insight.tsx'),
    'utf8',
  )

  const tones: { color: string; tag: string }[] = [
    { color: 'emerald', tag: 'on-track' },
    { color: 'amber', tag: 'underestimating' },
    { color: 'sky', tag: 'overestimating' },
    { color: 'violet', tag: 'mixed' },
  ]

  for (const t of tones) {
    if (
      !ebi.includes(
        `dark:bg-${t.color}-950/30 dark:text-${t.color}-300 dark:border-${t.color}-900/50`,
      )
    ) {
      findings.push({
        level: 'error',
        message: `estimate-bias-insight.tsx: ${t.tag} (${t.color}) dark token (3 件) 不在`,
      })
    }
  }

  // unknown は theme-aware で touch なし (回帰 guard)
  if (!ebi.includes("unknown: 'bg-muted text-foreground border-border'")) {
    findings.push({
      level: 'error',
      message: 'estimate-bias-insight.tsx: unknown theme-aware invariant 喪失',
    })
  }

  // iter1516 calibrated chip invariant cross-check (回帰 guard)
  const atp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/active-timer-panel.tsx'),
    'utf8',
  )
  if (!atp.includes('dark:border-cyan-900/50 dark:bg-cyan-950/30 dark:text-cyan-300')) {
    findings.push({
      level: 'error',
      message: 'active-timer-panel.tsx: iter1516 calibrated chip invariant 喪失',
    })
  }

  console.log(`\n=== Findings (iter1517 estimate-bias TENDENCY_TONE 4 chip dark variant) ===`)
  if (findings.length === 0)
    console.log(
      '(なし) — 4 tone dark token + unknown theme-aware + iter1516 calibrated invariant OK',
    )
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()
