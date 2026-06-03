/**
 * Phase 6.15 loop iter 1708 — Today view today-done-count chip の aria-label
 * を visible text と一致化、「今日」 二重読み上げを解消。
 *
 * 課題: src/components/workspace/today-view.tsx 221 行 (iter1729 配線) の
 *   `aria-label={`今日累計完了 — ${doneTodaySignal.text}`}` は formatDoneTodayJa 出力
 *   (= "今日 N 件完了!" / "今日 まだ 0 件" 等) が「今日」 で始まるため、accessible
 *   name が `今日累計完了 — 今日 N 件完了!` と「今日」 を 2 回 redundant 含む。
 *   SR は live region 経路で「今日累計完了 こんにち N けんかんりょう」 と冗長読み上げ。
 *   Duolingo「Today's progress」 / GitHub「Today X commits」 等の sibling UI は
 *   単に「5 done today!」 のみで冗長無し。
 *
 * fix: aria-label を visible chip text と同一に集約 (`aria-label={doneTodaySignal.text}`)。
 *   SR 読み上げは「今日 N 件完了!」 のみで冗長解消、visible / accessible name 完全一致で
 *   WCAG 2.5.3 Label in Name も自然満足。
 *   streak chip (line 211) は visible が emoji + label のみで「streak」 context が無いため
 *   `完了 streak — ` prefix は維持 (= 異なる pattern、本 fix の scope 外)。
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

  const target = 'src/components/workspace/today-view.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  // 1. 旧 redundant prefix aria-label 不在
  if (/aria-label=\{`今日累計完了 — \$\{doneTodaySignal\.text\}`\}/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: 旧 redundant aria-label \`今日累計完了 — \${...}\` が残存`,
    })
  } else {
    findings.push({ level: 'info', message: 'today-done-count 旧 redundant prefix 撤去 OK' })
  }

  // 2. 新 aria-label = visible text (+ optional iter1738 priority detail、`今日累計完了` prefix 撤去済)
  if (!/aria-label=\{`\$\{doneTodaySignal\.text\}\$\{doneTodayPriorityDetail\}`\}/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: 新 \`aria-label={\\\`\${doneTodaySignal.text}\${doneTodayPriorityDetail}\\\`}\` が無い`,
    })
  } else {
    findings.push({
      level: 'info',
      message: 'today-done-count aria-label visible+iter1738 priority OK',
    })
  }

  // 3. streak chip aria-label invariant (本 fix の scope 外、prefix 維持)
  if (!/aria-label=\{`完了 streak — \$\{streakSignals\.milestone\.text\}`\}/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: streak chip aria-label "完了 streak — ..." invariant が壊れた`,
    })
  }

  // 4. visible chip text invariant
  if (!/\{doneTodaySignal\.text\}/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: visible chip text \`{doneTodaySignal.text}\` が消えた`,
    })
  }

  // 5. iter1707 hygiene-focus invariant (regression guard)
  const dashboard = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/dashboard-view.tsx'),
    'utf8',
  )
  if (
    !/ariaLabel=\{`重点: P\$\{hygieneFocus\.focus\.priority\} Hygiene \$\{hygieneFocus\.focus\.score\} — \$\{hygieneFocus\.detail\}`\}/.test(
      dashboard,
    )
  ) {
    findings.push({
      level: 'warning',
      message: 'dashboard-view.tsx: iter1707 hygiene-focus invariant が壊れた',
    })
  }

  console.log(`\n=== Findings (today-done-chip-deredundant-iter1708) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
