/**
 * Phase 6.15 loop iter 1704 — dashboard-view の hygiene-debt chip ariaLabel を
 * visible-prefix 化 (WCAG 2.5.3 Label in Name 違反解消)。
 *
 * 課題: src/components/workspace/dashboard-view.tsx 1027 行 hygiene-debt chip の
 *   旧 ariaLabel `hygieneDebt.detail` は formatHygieneDebtJa 出力 (= "Hygiene
 *   Debt: 8 件 ...") を直接渡し、visible chip text `Triage 候補: ${count}`
 *   (= UI 上「Triage 候補」 wording、SR は技術名「Hygiene Debt」を聞く) と
 *   完全に divergent。visible "Triage 候補" は accessible name に substring
 *   として含まれず WCAG 2.5.3 (Label in Name) 違反 + voice control
 *   「click Triage 候補」 strict prefix match 不可。
 *
 * fix: ariaLabel に `Triage 候補: ${count} — ` prefix を追加し visible chip
 *   text を accessible name の冒頭固定。detail (= "Hygiene Debt: ...") は
 *   em-dash 区切後の descriptive 部に保持 → SR は両方 hear、voice control は
 *   visible-prefix で hit。1 file 1 line 差替 + 5 line comment。
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
    !/ariaLabel=\{`Triage 候補: \$\{hygieneDebt\.stats\.debtCount\} — \$\{hygieneDebt\.detail\}`\}/.test(
      src,
    )
  ) {
    findings.push({
      level: 'warning',
      message: `${target}: 新 visible-prefix ariaLabel が無い`,
    })
  } else {
    findings.push({ level: 'info', message: 'hygiene-debt visible-prefix ariaLabel OK' })
  }

  // 2. 旧 `ariaLabel={hygieneDebt.detail}` 単独 pattern 撤去確認
  // (注: 新 pattern `ariaLabel={`Triage 候補: ${hygieneDebt.stats.debtCount} — ${hygieneDebt.detail}`}`
  // は内部に `${hygieneDebt.detail}` を含むため、`ariaLabel={hygieneDebt.detail}` 単独
  // (= em-dash で wrap されていない) のみを「旧」 として検出する負例 regex)
  if (/ariaLabel=\{hygieneDebt\.detail\}/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: 旧 \`ariaLabel={hygieneDebt.detail}\` 単独 pattern が残存`,
    })
  } else {
    findings.push({ level: 'info', message: 'hygiene-debt 旧 ariaLabel pattern 撤去 OK' })
  }

  // 3. visible chip text `Triage 候補: ${count}` invariant (UI 不変)
  if (!/text=\{`Triage 候補: \$\{hygieneDebt\.stats\.debtCount\}`\}/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: visible chip text invariant が壊れた`,
    })
  }

  // 4. title attribute invariant (= hygieneDebt.detail 維持、aria-label 専用 fix)
  if (!/title=\{hygieneDebt\.detail\}/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: title={hygieneDebt.detail} invariant が壊れた`,
    })
  }

  // 5. iter1703 backlog-aging invariant
  if (!/\$\{aging\.hintLabel\} — Backlog 年齢 \$\{aging\.summary\}/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: iter1703 backlog-aging em-dash invariant が壊れた`,
    })
  }

  // 6. iter1702 urgency-tiers invariant
  if (!/— 全体 \$\{formatUrgencyTierCounts\(counts\)\}/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: iter1702 urgency-tiers 全体 em-dash invariant が壊れた`,
    })
  }

  console.log(`\n=== Findings (hygiene-debt-visible-prefix-iter1704) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
