/**
 * Phase 6.15 loop iter 388 — pdca-panel の DailyBars chart 軸 label
 * (data[0]?.date.slice(5) / data[N-1]?.date.slice(5)) に `<time dateTime>`
 * semantic を付与 (iter380-387 pattern を chart 軸にも展開)。
 *
 * 課題: src/components/workspace/pdca-panel.tsx の DailyBars chart 下端の
 *   開始 / 終了日 label (line 235-238) は plain `<span>{data[0]?.date.slice(5)}</span>`
 *   形式で `<time>` 不在。WCAG 1.3.1 semantic gap、SR が "04-30" を numeric
 *   として読み上げ chart 軸 label と認識できない。bar 自体は role="listitem" +
 *   aria-label で日付情報を持つが、軸の terminal 2 label は無装飾だった。
 *
 * fix: src/components/workspace/pdca-panel.tsx 1 file × 1 箇所 (約 14 line
 *   差替、機能追加なし、shadcn 編集なし)。tuple 表現で TypeScript の strict
 *   `noUncheckedIndexedAccess` 制約 ([N-1] が undefined 可能) を IIFE で
 *   local const 化し、`<time dateTime={first}>{first.slice(5)}</time>` で
 *   wrap、null 時は空 span fallback (justify-between layout を維持)。
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
  const target = 'src/components/workspace/pdca-panel.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  // 1. <time dateTime={first}> + first.slice(5)
  if (
    !/<time dateTime=\{first\}>\{first\.slice\(5\)\}<\/time>/.test(src) ||
    !/<time dateTime=\{last\}>\{last\.slice\(5\)\}<\/time>/.test(src)
  ) {
    findings.push({
      level: 'warning',
      message: `${target}: chart 軸 label に <time dateTime> wrap が無い (first / last)`,
    })
  } else {
    findings.push({ level: 'info', message: 'pdca DailyBars 軸 label <time> OK' })
  }

  // 2. 旧 plain span
  if (/<span>\{data\[0\]\?\.date\.slice\(5\)\}<\/span>/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: 旧 <span>{data[0]?.date.slice(5)}</span> が残っている`,
    })
  }
  if (/<span>\{data\[data\.length - 1\]\?\.date\.slice\(5\)\}<\/span>/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: 旧 <span>{data[N-1]?.date.slice(5)}</span> が残っている`,
    })
  }

  // 3. iter378-387 invariant 維持 (regression guard)
  for (const f of [
    'src/components/workspace/dashboard-view.tsx',
    'src/components/workspace/today-view.tsx',
    'src/components/workspace/kanban-view.tsx',
    'src/components/workspace/sprints-panel.tsx',
    'src/components/workspace/goals-panel.tsx',
    'src/components/workspace/archived-items-panel.tsx',
  ]) {
    const s = readFileSync(resolve(process.cwd(), f), 'utf8')
    if (
      f.endsWith('dashboard-view.tsx') &&
      !/<time dateTime=\{item\.dueDate\}>\{item\.dueDate\}<\/time>/.test(s)
    ) {
      findings.push({ level: 'warning', message: `${f}: iter387 dashboard <time> 消えた` })
    }
    if (f.endsWith('today-view.tsx') && !/<time dateTime=\{it\.dueDate\}>/.test(s)) {
      findings.push({ level: 'warning', message: `${f}: iter386 today <time> 消えた` })
    }
    if (f.endsWith('kanban-view.tsx') && !/<time dateTime=\{item\.dueDate\}>/.test(s)) {
      findings.push({ level: 'warning', message: `${f}: iter386 kanban <time> 消えた` })
    }
    if (f.endsWith('sprints-panel.tsx') && !/<time dateTime=\{sprint\.startDate\}>/.test(s)) {
      findings.push({ level: 'warning', message: `${f}: iter385 sprint <time> 消えた` })
    }
    if (f.endsWith('goals-panel.tsx') && !/<time dateTime=\{goal\.startDate\}>/.test(s)) {
      findings.push({ level: 'warning', message: `${f}: iter385 goal <time> 消えた` })
    }
    if (f.endsWith('archived-items-panel.tsx') && !/function FmtTime\(\{ value \}/.test(s)) {
      findings.push({ level: 'warning', message: `${f}: iter384 FmtTime 消えた` })
    }
  }

  console.log(`\n=== Findings (pdca-axis-time-iter388) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
