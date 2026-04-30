/**
 * Phase 6.15 loop iter 386 — today-view + kanban-view の Item dueDate /
 * startDate 表示に `<time dateTime>` semantic を展開 (iter380 / iter384 /
 * iter385 pattern を Item-level view にも統一)。
 *
 * 課題: src/components/workspace/today-view.tsx の dueDate cell および
 *   src/components/workspace/kanban-view.tsx の startDate / dueDate cell は
 *   `formatFriendlyDate(...)` 出力の plain string を直接表示していた。
 *   `<time>` 不在で WCAG 1.3.1 semantic gap、SR は date と他 text を
 *   区別できない (今 view は同 div 内に「期限 4/30 (木)」表示)。
 *
 * fix: 2 file × 各 1 箇所 (合計 約 14 line 差替、機能追加なし、shadcn 編集なし)。
 *   - today-view.tsx: dueDate を `<time dateTime={it.dueDate}>{formatFriendlyDate(...)}</time>`
 *     で wrap (期限 prefix の後ろ)
 *   - kanban-view.tsx: startDate と dueDate それぞれを fragment 化し
 *     `<time dateTime={item.startDate}>` / `<time dateTime={item.dueDate}>` で wrap、
 *     既存の title attr の生 ISO は SR でなく hover 用に残置
 *
 * iter380 / 384 / 385 / 386 で codebase 内 panel + Item view date 表示が
 * 全て `<time dateTime>` semantic に統一される。
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

  // 1. today-view: dueDate <time>
  const tvTarget = 'src/components/workspace/today-view.tsx'
  const tvSrc = readFileSync(resolve(process.cwd(), tvTarget), 'utf8')
  if (
    !/<time dateTime=\{it\.dueDate\}>[\s\S]*?formatFriendlyDate\(it\.dueDate, todayDate\)[\s\S]*?<\/time>/.test(
      tvSrc,
    )
  ) {
    findings.push({
      level: 'warning',
      message: `${tvTarget}: <time dateTime={it.dueDate}> wrap が無い`,
    })
  } else {
    findings.push({ level: 'info', message: 'today-view dueDate <time> OK' })
  }

  // 2. kanban-view: startDate + dueDate <time>
  const kvTarget = 'src/components/workspace/kanban-view.tsx'
  const kvSrc = readFileSync(resolve(process.cwd(), kvTarget), 'utf8')
  if (
    !/<time dateTime=\{item\.startDate\}>[\s\S]*?formatFriendlyDate\(item\.startDate, today\)[\s\S]*?<\/time>/.test(
      kvSrc,
    )
  ) {
    findings.push({
      level: 'warning',
      message: `${kvTarget}: <time dateTime={item.startDate}> wrap が無い`,
    })
  } else {
    findings.push({ level: 'info', message: 'kanban-view startDate <time> OK' })
  }
  if (
    !/<time dateTime=\{item\.dueDate\}>\{formatFriendlyDate\(item\.dueDate, today\)\}<\/time>/.test(
      kvSrc,
    )
  ) {
    findings.push({
      level: 'warning',
      message: `${kvTarget}: <time dateTime={item.dueDate}> wrap が無い`,
    })
  }

  // 3. iter378-385 invariant 維持 (regression guard)
  for (const f of [
    'src/components/mock-timesheet/mock-login-form.tsx',
    'src/components/mock-timesheet/mock-submit-form.tsx',
    'src/components/mock-timesheet/mock-top-nav.tsx',
    'src/components/shared/keybindings-help-modal.tsx',
    'src/components/workflow/workflows-panel.tsx',
    'src/components/workspace/archived-items-panel.tsx',
    'src/components/workspace/sprints-panel.tsx',
    'src/components/workspace/goals-panel.tsx',
  ]) {
    const s = readFileSync(resolve(process.cwd(), f), 'utf8')
    if (f.endsWith('archived-items-panel.tsx') && !/function FmtTime\(\{ value \}/.test(s)) {
      findings.push({ level: 'warning', message: `${f}: iter384 FmtTime component が消えた` })
    }
    if (f.endsWith('sprints-panel.tsx') && !/<time dateTime=\{sprint\.startDate\}>/.test(s)) {
      findings.push({ level: 'warning', message: `${f}: iter385 sprint <time> wrap が消えた` })
    }
    if (f.endsWith('goals-panel.tsx') && !/<time dateTime=\{goal\.startDate\}>/.test(s)) {
      findings.push({ level: 'warning', message: `${f}: iter385 goal <time> wrap が消えた` })
    }
    if (
      f.endsWith('workflows-panel.tsx') &&
      !/id=\{`wf-editor-error-\$\{wf\.id\}`\}[\s\S]*?role="alert"/.test(s)
    ) {
      findings.push({ level: 'warning', message: `${f}: iter383 inline error role=alert が消えた` })
    }
  }

  console.log(`\n=== Findings (item-due-time-iter386) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
