/**
 * Phase 6.15 loop iter 1705 — diff-summary-bar の SeverityChip ariaLabel から
 * colon `:` を撤去 (iter1629 / iter1701 / iter1702 / iter1703 sweep の 5 弾目)。
 *
 * 課題: src/components/schedule/diff-summary-bar.tsx 86 行 SeverityChip ariaLabel
 *   `${title} — ${sevLabel}: 想定 ${X} 実測 ${Y}${delta}` は em-dash 区切後の
 *   descriptor 部に colon `:` が残存 (= iter1189 visible-prefix 修正時の sweep
 *   の取りこぼし)。iter1629 / iter1701 / iter1702 / iter1703 em-dash + colon 無
 *   natural-reading convention と divergent。
 *
 * fix: `${sevLabel}: 想定 ${X}` → `${sevLabel} 想定 ${X}` (1 line 差替 + 3 line
 *   comment)。visible-prefix `${title}` 部は不変 (= voice control prefix match 維持)、
 *   SR 読み上げ "{title} — 注意 (1.1〜1.5x) 想定 60m 実測 90m 差分 +30m" の
 *   natural-reading flow。
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

  const target = 'src/components/schedule/diff-summary-bar.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  // 1. 旧 colon ariaLabel 不在
  if (/ariaLabel=\{`\$\{title\} — \$\{sevLabel\}: 想定 /.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: 旧 \`\${sevLabel}: 想定 …\` colon が残存`,
    })
  } else {
    findings.push({ level: 'info', message: 'diff-summary 旧 colon 撤去 OK' })
  }

  // 2. 新 em-dash convention 存在
  if (
    !/ariaLabel=\{`\$\{title\} — \$\{sevLabel\} 想定 \$\{fmtMin\(r\.plannedMinutes\)\} 実測 \$\{fmtMin\(r\.actualMinutes\)\}\$\{deltaText\}`\}/.test(
      src,
    )
  ) {
    findings.push({
      level: 'warning',
      message: `${target}: 新 \`\${sevLabel} 想定\` em-dash convention が無い`,
    })
  } else {
    findings.push({ level: 'info', message: 'diff-summary 新 em-dash ariaLabel OK' })
  }

  // 3. visible {title} 冒頭 invariant (= iter1189 visible-prefix 維持)
  if (!/ariaLabel=\{`\$\{title\} — /.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: iter1189 \${title} visible-prefix 冒頭 invariant が壊れた`,
    })
  }

  // 4. iter1704 hygiene-debt visible-prefix invariant
  const dashboard = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/dashboard-view.tsx'),
    'utf8',
  )
  if (
    !/ariaLabel=\{`Triage 候補: \$\{hygieneDebt\.stats\.debtCount\} — \$\{hygieneDebt\.detail\}`\}/.test(
      dashboard,
    )
  ) {
    findings.push({
      level: 'warning',
      message: 'dashboard-view.tsx: iter1704 hygiene-debt visible-prefix invariant が壊れた',
    })
  }

  // 5. iter1703 backlog-aging invariant
  if (!/\$\{aging\.hintLabel\} — Backlog 年齢 \$\{aging\.summary\}/.test(dashboard)) {
    findings.push({
      level: 'warning',
      message: 'dashboard-view.tsx: iter1703 backlog-aging em-dash invariant が壊れた',
    })
  }

  console.log(`\n=== Findings (diff-summary-em-dash-iter1705) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
