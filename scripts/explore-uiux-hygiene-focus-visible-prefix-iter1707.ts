/**
 * Phase 6.15 loop iter 1707 — dashboard-view の hygiene-focus chip ariaLabel を
 * visible-prefix 化 (iter1704 hygiene-debt / iter1706 hygiene-score と同 pattern、
 * WCAG 2.5.3 違反解消)。
 *
 * 課題: src/components/workspace/dashboard-view.tsx 1018 行 hygiene-focus chip の
 *   旧 ariaLabel `hygieneFocus.detail` (= "要注意: P3 Hygiene 25 — ...") は visible
 *   chip text `重点: P${X} Hygiene ${Y}` (= UI wording「重点」 CTA、format 関数は
 *   技術名「要注意」) と wording 完全 divergent。visible "重点" は accessible name に
 *   substring として含まれず WCAG 2.5.3 (Label in Name) 違反 + voice control
 *   「click 重点」 strict prefix match 不可。
 *
 * fix: visible-prefix `重点: P${X} Hygiene ${Y} — ` を冒頭固定 + em-dash 区切で
 *   detail を descriptive 末尾に保持。SR は両 wording を hear (UI 重点 + 技術
 *   要注意)、voice control「click 重点」 prefix match 可能。
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
    !/ariaLabel=\{`重点: P\$\{hygieneFocus\.focus\.priority\} Hygiene \$\{hygieneFocus\.focus\.score\} — \$\{hygieneFocus\.detail\}`\}/.test(
      src,
    )
  ) {
    findings.push({
      level: 'warning',
      message: `${target}: 新 visible-prefix ariaLabel が無い`,
    })
  } else {
    findings.push({ level: 'info', message: 'hygiene-focus visible-prefix ariaLabel OK' })
  }

  // 2. 旧 `ariaLabel={hygieneFocus.detail}` 単独 pattern 撤去
  if (/ariaLabel=\{hygieneFocus\.detail\}/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: 旧 \`ariaLabel={hygieneFocus.detail}\` 単独 pattern が残存`,
    })
  } else {
    findings.push({ level: 'info', message: 'hygiene-focus 旧 ariaLabel pattern 撤去 OK' })
  }

  // 3. visible chip text invariant
  if (
    !/text=\{`重点: P\$\{hygieneFocus\.focus\.priority\} Hygiene \$\{hygieneFocus\.focus\.score\}`\}/.test(
      src,
    )
  ) {
    findings.push({
      level: 'warning',
      message: `${target}: visible chip text invariant が壊れた`,
    })
  }

  // 4. title attribute invariant
  if (!/title=\{hygieneFocus\.detail\}/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: title={hygieneFocus.detail} invariant が壊れた`,
    })
  }

  // 5. iter1706 hygiene-score invariant
  if (
    !/ariaLabel=\{`Hygiene \$\{hygieneScore\.score\.score\} — \$\{hygieneScore\.detail\}`\}/.test(
      src,
    )
  ) {
    findings.push({
      level: 'warning',
      message: `${target}: iter1706 hygiene-score visible-prefix invariant が壊れた`,
    })
  }

  // 6. iter1704 hygiene-debt invariant
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

  console.log(`\n=== Findings (hygiene-focus-visible-prefix-iter1707) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
