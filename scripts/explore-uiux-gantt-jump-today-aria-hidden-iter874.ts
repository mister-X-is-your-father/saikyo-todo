/**
 * Phase 6.15 loop iter 874 (mode-D Desktop a11y) —
 * gantt-view "今日へジャンプ" button visible を aria-hidden span で wrap。
 *
 * 課題: src/components/workspace/gantt-view.tsx 行 395-406 の gantt-jump-today
 *   button は動的 aria-label "Gantt timeline を今日 (M月d日 (eee)) の縦線まで
 *   横スクロール" が完全 content を含むのに visible "今日へジャンプ" は
 *   aria-hidden 無し → SR 2 経路読み上げ重複。iter849 (calendar-view 「今日」
 *   button) と sibling な「今日」 navigation control fix。iter844-873 と同 vocabulary。
 *
 * fix (1 ファイル +1/-1 行):
 *   - <span aria-hidden="true">今日へジャンプ</span>
 *
 * 検証: source-side regex assert + iter849 (calendar today) / iter873 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')

  if (
    /data-testid="gantt-jump-today"[\s\S]*?<span aria-hidden="true">今日へジャンプ<\/span>/.test(gv)
  ) {
    findings.push({
      level: 'info',
      message: `iter874: gantt-jump-today button aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter874: gantt-jump-today button aria-hidden 不完全`,
    })
  }

  // invariant: aria-label / data-testid 維持
  if (
    /data-testid="gantt-jump-today"/.test(gv) &&
    /aria-label=\{`Gantt timeline を今日 \(\$\{format\(new Date\(\), 'M月d日 \(eee\)'\)\}\) の縦線まで横スクロール`\}/.test(
      gv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter874 invariant: gantt-jump-today aria-label / data-testid 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter874 invariant: 破壊` })
  }

  // iter849 invariant: calendar-view today button aria-hidden (sibling pattern)
  const cv = readFileSync(
    resolve(process.cwd(), 'src/components/schedule/calendar-view.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">今日<\/span>/.test(cv)) {
    findings.push({
      level: 'info',
      message: `iter849 invariant: calendar-view today button 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter849 invariant: 破壊` })
  }

  // iter873 invariant: comment-thread 4 button
  const ct = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/comment-thread.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">キャンセル<\/span>/.test(ct) &&
    /<span aria-hidden="true">削除<\/span>/.test(ct)
  ) {
    findings.push({
      level: 'info',
      message: `iter873 invariant: comment-thread 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter873 invariant: 破壊` })
  }

  console.log(`\n=== Findings (gantt-jump-today-aria-hidden-iter874) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
