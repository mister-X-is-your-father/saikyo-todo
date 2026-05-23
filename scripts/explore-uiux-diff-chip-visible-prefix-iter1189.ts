/**
 * Phase 6.15 loop iter1189: schedule/diff-summary-bar SeverityChip ariaLabel visible-prefix
 * regression guard。
 *
 * iter1189 で発見した visible-prefix 漏れ: diff-summary-bar.tsx の SeverityChip
 * (onClick あり = button render) 旧 ariaLabel `${sevLabel}: ${title} 想定 ...` は
 * visible "{title}" を中位置 "{sevLabel}: **{title}** ..." に持ち voice control
 * prefix-matching「click {title}」 match 不可 (substring 一致のみ)。
 *
 * 修正 (diff-summary-bar.tsx):
 *   - 旧 ariaLabel: `${sevLabel}: ${title} 想定 ${planned} 実測 ${actual}${deltaText}`
 *   - 新 ariaLabel: `${title} — ${sevLabel}: 想定 ${planned} 実測 ${actual}${deltaText}`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-diff-chip-visible-prefix-iter1189.ts
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
  const filePath = resolve(here, '../src/components/schedule/diff-summary-bar.tsx')
  const src = readFileSync(filePath, 'utf8')

  if (
    !src.includes(
      '`${title} — ${sevLabel}: 想定 ${fmtMin(r.plannedMinutes)} 実測 ${fmtMin(r.actualMinutes)}${deltaText}`',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'diff-chip ariaLabel が visible-prefix 形式 "${title} — ${sevLabel}: ..." でない',
    })
  }
  if (
    src.includes(
      '`${sevLabel}: ${title} 想定 ${fmtMin(r.plannedMinutes)} 実測 ${fmtMin(r.actualMinutes)}${deltaText}`',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 prefix-less "${sevLabel}: ${title} ..." が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — diff-chip ariaLabel は visible "{title}" 冒頭固定済')
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
