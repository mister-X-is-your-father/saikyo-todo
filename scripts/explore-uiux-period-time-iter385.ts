/**
 * Phase 6.15 loop iter 385 — sprints-panel + goals-panel の period 表示に
 * `<time dateTime>` semantic を展開 (iter380 mock-entries / iter384
 * archived-items pattern を panel 系にも統一)。
 *
 * 課題: src/components/workspace/sprints-panel.tsx の sprint period 表示
 *   `{formatDateJa(sprint.startDate)} 〜 {formatDateJa(sprint.endDate)}`、および
 *   src/components/workspace/goals-panel.tsx の goal period 表示
 *   `{goal.period} · {goal.startDate} 〜 {goal.endDate}` は plain string で
 *   `<time>` 不在。SR 時刻読み上げが numeric として不自然 + 機械可読データ
 *   不識別 (WCAG 1.3.1 gap)。
 *
 * fix: 2 file × 各 1 箇所 (合計 約 12 line 差替、機能追加なし、shadcn 編集なし)。
 *   - sprints-panel.tsx: `<time dateTime={sprint.startDate}>{formatDateJa(...)}</time>`
 *     `<time dateTime={sprint.endDate}>{formatDateJa(...)}</time>` で 〜 区切り
 *   - goals-panel.tsx: `<time dateTime={goal.startDate}>{goal.startDate}</time>`
 *     `<time dateTime={goal.endDate}>{goal.endDate}</time>` で 〜 区切り
 *
 * iter380 (mock-entries) / iter384 (archived-items) と合わせて codebase 内 panel
 * 系 date 表示が `<time dateTime>` semantic で統一される。
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

  // 1. sprints-panel: <time dateTime={sprint.startDate / endDate}>
  const spTarget = 'src/components/workspace/sprints-panel.tsx'
  const spSrc = readFileSync(resolve(process.cwd(), spTarget), 'utf8')
  if (
    !/<time dateTime=\{sprint\.startDate\}>\{formatDateJa\(sprint\.startDate\)\}<\/time>/.test(
      spSrc,
    )
  ) {
    findings.push({
      level: 'warning',
      message: `${spTarget}: <time dateTime={sprint.startDate}> wrap が無い`,
    })
  } else {
    findings.push({ level: 'info', message: 'sprints-panel sprint.startDate <time> OK' })
  }
  if (
    !/<time dateTime=\{sprint\.endDate\}>\{formatDateJa\(sprint\.endDate\)\}<\/time>/.test(spSrc)
  ) {
    findings.push({
      level: 'warning',
      message: `${spTarget}: <time dateTime={sprint.endDate}> wrap が無い`,
    })
  }

  // 2. goals-panel: <time dateTime={goal.startDate / endDate}>
  const goTarget = 'src/components/workspace/goals-panel.tsx'
  const goSrc = readFileSync(resolve(process.cwd(), goTarget), 'utf8')
  if (!/<time dateTime=\{goal\.startDate\}>\{goal\.startDate\}<\/time>/.test(goSrc)) {
    findings.push({
      level: 'warning',
      message: `${goTarget}: <time dateTime={goal.startDate}> wrap が無い`,
    })
  } else {
    findings.push({ level: 'info', message: 'goals-panel goal.startDate <time> OK' })
  }
  if (!/<time dateTime=\{goal\.endDate\}>\{goal\.endDate\}<\/time>/.test(goSrc)) {
    findings.push({
      level: 'warning',
      message: `${goTarget}: <time dateTime={goal.endDate}> wrap が無い`,
    })
  }

  // 3. iter378-384 invariant 維持 (regression guard)
  for (const f of [
    'src/components/mock-timesheet/mock-login-form.tsx',
    'src/components/mock-timesheet/mock-submit-form.tsx',
    'src/components/mock-timesheet/mock-top-nav.tsx',
    'src/components/shared/keybindings-help-modal.tsx',
    'src/components/workflow/workflows-panel.tsx',
    'src/components/workspace/archived-items-panel.tsx',
  ]) {
    const s = readFileSync(resolve(process.cwd(), f), 'utf8')
    if (f.endsWith('archived-items-panel.tsx') && !/function FmtTime\(\{ value \}/.test(s)) {
      findings.push({ level: 'warning', message: `${f}: iter384 FmtTime component が消えた` })
    }
    if (
      f.endsWith('workflows-panel.tsx') &&
      !/id=\{`wf-editor-error-\$\{wf\.id\}`\}[\s\S]*?role="alert"/.test(s)
    ) {
      findings.push({ level: 'warning', message: `${f}: iter383 inline error role=alert が消えた` })
    }
    if (
      f.endsWith('keybindings-help-modal.tsx') &&
      (!/aria-labelledby=\{headingId\}/.test(s) ||
        !/aria-label=\{`ショートカット \$\{kb\.combo\}`\}/.test(s))
    ) {
      findings.push({ level: 'warning', message: `${f}: iter382 section/dt a11y pattern が消えた` })
    }
    if (
      f.endsWith('mock-top-nav.tsx') &&
      !/<nav\s+aria-label="mock-timesheet ナビゲーション"/.test(s)
    ) {
      findings.push({ level: 'warning', message: `${f}: iter381 nav landmark が消えた` })
    }
    if (
      (f.endsWith('mock-login-form.tsx') || f.endsWith('mock-submit-form.tsx')) &&
      (!/function onInvalid\(errors:/.test(s) || !/handleSubmit\(onSubmit, onInvalid\)/.test(s))
    ) {
      findings.push({ level: 'warning', message: `${f}: iter378/379 onInvalid pattern が消えた` })
    }
  }

  console.log(`\n=== Findings (period-time-iter385) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
