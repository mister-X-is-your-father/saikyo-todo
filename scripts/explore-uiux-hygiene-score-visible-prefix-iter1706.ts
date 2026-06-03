/**
 * Phase 6.15 loop iter 1706 — dashboard-view の hygiene-score chip ariaLabel を
 * visible-prefix 化 (iter1704 hygiene-debt と同 pattern、WCAG 2.5.3 違反解消)。
 *
 * 課題: src/components/workspace/dashboard-view.tsx 998 行 hygiene-score chip
 *   の旧 ariaLabel `hygieneScore.detail` は formatCombinedHygieneJa 出力
 *   (= "Planning Hygiene: 75 (期限 80% / DoD 60% / 説明文 70%)") を直接渡し、
 *   visible chip text `Hygiene ${score}` (= "Hygiene 75"、`:` 無) を substring
 *   として含まず WCAG 2.5.3 (Label in Name) 違反 + voice control
 *   「click Hygiene」 strict prefix match 不可 (accessible name 冒頭が
 *   "Planning Hygiene:")。
 *
 * fix: ariaLabel に `Hygiene ${score} — ` prefix を追加し visible chip text を
 *   accessible name の冒頭固定。detail (= "Planning Hygiene: ...") は em-dash
 *   区切後の descriptive 部に保持 → SR は両方 hear、voice control は
 *   visible-prefix で hit。iter1704 hygiene-debt と同 pattern。
 *
 * 検証: source-side regex assert で codify。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const target = 'src/components/workspace/dashboard-view.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  // 1. 新 visible-prefix ariaLabel 存在
  if (
    !/ariaLabel=\{`Hygiene \$\{hygieneScore\.score\.score\} — \$\{hygieneScore\.detail\}`\}/.test(
      src,
    )
  ) {
    findings.push({
      level: 'warning',
      message: `${target}: 新 visible-prefix ariaLabel が無い`,
    })
  } else {
    findings.push({ level: 'info', message: 'hygiene-score visible-prefix ariaLabel OK' })
  }

  // 2. 旧 `ariaLabel={hygieneScore.detail}` 単独 pattern 撤去
  if (/ariaLabel=\{hygieneScore\.detail\}/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: 旧 \`ariaLabel={hygieneScore.detail}\` 単独 pattern が残存`,
    })
  } else {
    findings.push({ level: 'info', message: 'hygiene-score 旧 ariaLabel pattern 撤去 OK' })
  }

  // 3. visible chip text invariant
  if (!/text=\{`Hygiene \$\{hygieneScore\.score\.score\}`\}/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: visible chip text invariant が壊れた`,
    })
  }

  // 4. title attribute invariant (detail 維持、aria-label 専用 fix)
  if (!/title=\{hygieneScore\.detail\}/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: title={hygieneScore.detail} invariant が壊れた`,
    })
  }

  // 5. iter1704 hygiene-debt invariant (regression guard)
  if (
    !/ariaLabel=\{`Triage 候補: \$\{hygieneDebt\.stats\.debtCount\} — \$\{hygieneDebt\.detail\}`\}/.test(
      src,
    )
  ) {
    findings.push({
      level: 'warning',
      message: `${target}: iter1704 hygiene-debt visible-prefix invariant が壊れた`,
    })
  }

  // 6. iter1703 backlog-aging invariant
  if (!/\$\{aging\.hintLabel\} — Backlog 年齢 \$\{aging\.summary\}/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: iter1703 backlog-aging em-dash invariant が壊れた`,
    })
  }

  // 7. iter1705 diff-summary invariant
  const diffSummary = readFileSync(
    resolve(process.cwd(), 'src/components/schedule/diff-summary-bar.tsx'),
    'utf8',
  )
  if (!/ariaLabel=\{`\$\{title\} — \$\{sevLabel\} 想定 /.test(diffSummary)) {
    findings.push({
      level: 'warning',
      message: 'diff-summary-bar.tsx: iter1705 em-dash invariant が壊れた',
    })
  }

  console.log(`\n=== Findings (hygiene-score-visible-prefix-iter1706) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
