/**
 * Phase 6.15 loop iter1508: sprint-retro-widget trendIcon に dark variant を補完
 * (mode-D contrast、iter1391 pattern を sprint-retro trend 3 icon に展開)。
 *
 * sprint-retro-widget の trendIcon helper は trend ('up' / 'down' / 'flat') ごとに
 * `text-emerald-600` / `text-rose-600` / `text-slate-500` を返すが、light 固定で
 * dark mode で contrast が薄れる (dark slate background 上で hue が浅く視認性低)。
 * iter1391 で emerald-700 + dark:emerald-400 併記 pattern が確立済、本 3 icon にも展開。
 *
 * 修正 (sprint-retro-widget.tsx):
 *   up:   `text-emerald-600` → `text-emerald-600 dark:text-emerald-400`
 *   down: `text-rose-600`    → `text-rose-600 dark:text-rose-400`
 *   flat: `text-slate-500`   → `text-slate-500 dark:text-slate-400`
 *
 * 注: icon は aria-hidden で SR 対象外、WCAG 1.4.3 strict 必須ではないが「ぱっと見の
 * 伝達」 を dark でも保つために dark variant を補完。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-sprint-retro-trend-icon-dark-iter1508.ts
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
  const filePath = resolve(here, '../src/components/sprint/sprint-retro-widget.tsx')
  const src = readFileSync(filePath, 'utf8')

  // 1. up icon dark variant
  if (!src.includes('text-emerald-600 dark:text-emerald-400')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sprint-retro trendIcon up icon に dark:text-emerald-400 が無い',
    })
  }
  // 2. down icon dark variant
  if (!src.includes('text-rose-600 dark:text-rose-400')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sprint-retro trendIcon down icon に dark:text-rose-400 が無い',
    })
  }
  // 3. flat icon dark variant
  if (!src.includes('text-slate-500 dark:text-slate-400')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sprint-retro trendIcon flat icon に dark:text-slate-400 が無い',
    })
  }

  // 4. iter1502 invariant: aria-label/valuetext em-dash 維持
  if (
    !src.includes(
      'aria-label={`Sprint Retro 完了率 ${summary.completionRate}% — ${completionRateSeverityLabelJa(sev)}`}',
    )
  ) {
    findings.push({
      level: 'warning',
      source: 'a11y',
      message: 'iter1502 invariant: sprint-retro progressbar aria-label em-dash が破壊された',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — sprint-retro trendIcon 3 trend で dark variant 補完済 (iter1391 pattern 展開)',
    )
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
