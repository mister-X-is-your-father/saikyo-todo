/**
 * Phase 6.15 loop iter 387 — dashboard-view の MUST item dueDate 表示に
 * `<time dateTime>` semantic を追加 (iter380 / 384 / 385 / 386 pattern を
 * dashboard 系にも展開)。
 *
 * 課題: src/components/workspace/dashboard-view.tsx の MUST item dueDate cell
 *   (line 1416) `{item.dueDate ?? '期限なし'}` は plain string 直接表示で
 *   `<time>` 不在。WCAG 1.3.1 semantic gap、SR は date と "期限なし" plain
 *   text を区別不能、機械可読データ識別なし。
 *
 * fix: src/components/workspace/dashboard-view.tsx 1 file × 1 箇所 (約 6 line
 *   差替、機能追加なし、shadcn 編集なし)。条件式を ternary 化し dueDate ありで
 *   `<time dateTime={item.dueDate}>{item.dueDate}</time>`、無しで '期限なし'
 *   plain text を返す。
 *
 * iter380 / 384 / 385 / 386 / 387 で codebase 内 panel + Item view +
 * dashboard date 表示が 全て `<time dateTime>` semantic に統一される。
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

  // 1. dashboard MUST item dueDate <time>
  if (!/<time dateTime=\{item\.dueDate\}>\{item\.dueDate\}<\/time>/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: <time dateTime={item.dueDate}>{item.dueDate}</time> wrap が無い`,
    })
  } else {
    findings.push({ level: 'info', message: 'dashboard MUST dueDate <time> OK' })
  }

  // 2. 旧 plain `{item.dueDate ?? '期限なし'}` が残っていない
  if (/>\{item\.dueDate \?\? '期限なし'\}</.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: 旧 plain {item.dueDate ?? '期限なし'} 形が残っている`,
    })
  }

  // 3. iter378-386 invariant 維持 (regression guard)
  for (const f of [
    'src/components/mock-timesheet/mock-login-form.tsx',
    'src/components/mock-timesheet/mock-submit-form.tsx',
    'src/components/mock-timesheet/mock-top-nav.tsx',
    'src/components/shared/keybindings-help-modal.tsx',
    'src/components/workflow/workflows-panel.tsx',
    'src/components/workspace/archived-items-panel.tsx',
    'src/components/workspace/sprints-panel.tsx',
    'src/components/workspace/goals-panel.tsx',
    'src/components/workspace/today-view.tsx',
    'src/components/workspace/kanban-view.tsx',
  ]) {
    const s = readFileSync(resolve(process.cwd(), f), 'utf8')
    if (f.endsWith('today-view.tsx') && !/<time dateTime=\{it\.dueDate\}>/.test(s)) {
      findings.push({ level: 'warning', message: `${f}: iter386 today dueDate <time> が消えた` })
    }
    if (f.endsWith('kanban-view.tsx') && !/<time dateTime=\{item\.dueDate\}>/.test(s)) {
      findings.push({ level: 'warning', message: `${f}: iter386 kanban dueDate <time> が消えた` })
    }
    if (f.endsWith('archived-items-panel.tsx') && !/function FmtTime\(\{ value \}/.test(s)) {
      findings.push({ level: 'warning', message: `${f}: iter384 FmtTime component が消えた` })
    }
    if (f.endsWith('sprints-panel.tsx') && !/<time dateTime=\{sprint\.startDate\}>/.test(s)) {
      findings.push({ level: 'warning', message: `${f}: iter385 sprint <time> wrap が消えた` })
    }
    if (f.endsWith('goals-panel.tsx') && !/<time dateTime=\{goal\.startDate\}>/.test(s)) {
      findings.push({ level: 'warning', message: `${f}: iter385 goal <time> wrap が消えた` })
    }
  }

  console.log(`\n=== Findings (dashboard-due-time-iter387) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
