/**
 * Phase 6.15 loop iter 534 (mode-D Desktop a11y) —
 * PersonalPeriodView (Daily / Weekly / Monthly) title cell button に aria-label を補完
 * (iter331 / iter531 / iter532 / iter533 title aria-label pattern を 5 view 目に展開、完全統一)。
 *
 * 課題: personal-period-view.tsx 行 219-229 の title button (= edit dialog open trigger)
 *   は data-testid のみで aria-label が無い。Daily / Weekly / Monthly 個人 view は
 *   各 period に items を並べる、SR には visible text (= title) のみで「button としての
 *   操作意図 (=編集)」が伝わらない。
 *
 * fix (1 ファイル ~1 行差分):
 *   - title button に aria-label={`「${it.title}」を編集`}
 *
 * iter331 (Kanban) / iter531 (Backlog) / iter532 (Dashboard MUST) / iter533 (Today) と
 * 同一文言で統一。+1 行差分、機能不変、視覚 layout 不変、shadcn 編集なし、data-testid /
 * className / onClick / e.stopPropagation invariant 維持。
 *
 * 検証: source-side regex assert + iter515-533 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ppv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/personal-period-view.tsx'),
    'utf8',
  )

  // 1. period-title aria-label
  if (
    /data-testid=\{`period-title-\$\{period\}-\$\{it\.id\}`\}\s+aria-label=\{`「\$\{it\.title\}」を編集`\}/.test(
      ppv,
    ) ||
    /aria-label=\{`「\$\{it\.title\}」を編集`\}\s+data-testid=\{`period-title-\$\{period\}-\$\{it\.id\}`\}/.test(
      ppv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `personal-period-view.tsx: period-title aria-label 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `personal-period-view.tsx: period-title aria-label 不在`,
    })
  }

  // 2. iter533 invariant: today-view title aria-label 維持
  const tv = readFileSync(resolve(process.cwd(), 'src/components/workspace/today-view.tsx'), 'utf8')
  if (
    /data-testid=\{`today-title-\$\{it\.id\}`\}\s+aria-label=\{`「\$\{it\.title\}」を編集`\}/.test(
      tv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter533 invariant: today-view title aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter533 invariant: today-view aria-label 破壊`,
    })
  }

  // 3. iter532 invariant: dashboard MUST title aria-label 維持
  const dv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/dashboard-view.tsx'),
    'utf8',
  )
  if (/aria-label=\{`MUST「\$\{item\.title\}」を編集`\}/.test(dv)) {
    findings.push({
      level: 'info',
      message: `iter532 invariant: dashboard MUST title aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter532 invariant: dashboard aria-label 破壊`,
    })
  }

  // 4. iter531 invariant: backlog title aria-label 維持
  const bv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )
  if (/aria-label=\{`「\$\{String\(getValue\(\)\)\}」を編集`\}/.test(bv)) {
    findings.push({
      level: 'info',
      message: `iter531 invariant: backlog-view title aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter531 invariant: backlog-view aria-label 破壊`,
    })
  }

  console.log(`\n=== Findings (personal-period-title-aria-iter534) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
