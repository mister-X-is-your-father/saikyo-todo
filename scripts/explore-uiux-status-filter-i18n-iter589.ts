/**
 * Phase 6.15 loop iter 589 (mode-D Desktop a11y) —
 * items-board status filter <select> aria-label に raw key (todo/in_progress/done) ではなく
 * 日本語 visible label (TODO/進行中/完了) を埋込み (WCAG 3.1.2 統一)。
 *
 * 課題: items-board.tsx 行 309-321 の status filter <select> は aria-label が
 *   `(現在: ${statusFilter})` で raw value (todo/in_progress/done) を直接補間。
 *   visible options は日本語 "TODO" / "進行中" / "完了" だが SR ユーザは
 *   "現在: in_progress" のように英語 raw key を聞かされ、visible 表示と乖離。
 *   WCAG 3.1.2 (Language of Parts) 観点で visible text と AT 表示は揃えるべき。
 *   未絞り込み時 hint も "(todo / in_progress / done)" → 日本語 "(TODO / 進行中 / 完了)"。
 *
 * fix (1 ファイル ~10 行差分):
 *   - 絞り込み中 aria-label: 3-way ternary で raw key を JP に変換 + fallback で
 *     未知 key (型 拡張時) はそのまま表示
 *   - 未絞り込み aria-label: hint を JP visible label に揃える
 *
 * iter587/588 (動的 aria-label expose) pattern の i18n 整合 axis、
 * SR ユーザに visible text と一致した日本語 status を伝える。
 *
 * 検証: source-side regex assert + iter515-588 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ib = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )

  // 1. status filter aria-label JP 変換: 'todo' → 'TODO'
  if (/statusFilter === 'todo'\s*\n?\s*\?\s*'TODO'/.test(ib)) {
    findings.push({ level: 'info', message: `status 'todo' → 'TODO' 変換 OK` })
  } else {
    findings.push({ level: 'warning', message: `status 'todo' → 'TODO' 変換なし` })
  }

  // 2. status filter aria-label JP 変換: 'in_progress' → '進行中'
  if (/'in_progress'\s*\n?\s*\?\s*'進行中'/.test(ib)) {
    findings.push({ level: 'info', message: `status 'in_progress' → '進行中' 変換 OK` })
  } else {
    findings.push({ level: 'warning', message: `status 'in_progress' → '進行中' 変換なし` })
  }

  // 3. status filter aria-label JP 変換: 'done' → '完了'
  if (/'done'\s*\n?\s*\?\s*'完了'/.test(ib)) {
    findings.push({ level: 'info', message: `status 'done' → '完了' 変換 OK` })
  } else {
    findings.push({ level: 'warning', message: `status 'done' → '完了' 変換なし` })
  }

  // 4. 未絞り込み hint も JP に揃える
  if (/'ステータスで絞り込み \(TODO \/ 進行中 \/ 完了\)'/.test(ib)) {
    findings.push({ level: 'info', message: `未絞り込み hint JP 揃え OK` })
  } else {
    findings.push({ level: 'warning', message: `未絞り込み hint JP 揃えなし` })
  }

  // 5. iter588 invariant: calendar-view nav button aria-label 維持
  const cv = readFileSync(
    resolve(process.cwd(), 'src/components/schedule/calendar-view.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`前日 \(\$\{format\(subDays\(date, 1\), 'M月d日 \(eee\)'\)\}\) を表示`\}/.test(cv)
  ) {
    findings.push({ level: 'info', message: `iter588 invariant: calendar prev button 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter588 invariant: 破壊` })
  }

  // 6. iter587 invariant: gantt-view show-deps / hide-done aria-label 維持
  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')
  if (
    /aria-label=\{showDeps \? '依存線を表示中 \(クリックで非表示\)' : '依存線を表示する'\}/.test(gv)
  ) {
    findings.push({ level: 'info', message: `iter587 invariant: gantt-view show-deps 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter587 invariant: 破壊` })
  }

  console.log(`\n=== Findings (status-filter-i18n-iter589) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
