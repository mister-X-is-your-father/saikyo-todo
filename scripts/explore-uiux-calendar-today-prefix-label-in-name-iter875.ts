/**
 * Phase 6.15 loop iter 875 (mode-D Desktop a11y) —
 * calendar-view 今日 reset button: WCAG 2.5.3 (Label in Name) prefix 適合。
 *
 * 課題: src/components/schedule/calendar-view.tsx の calendar-today-btn:
 *   - visible: "今日" (iter849 で aria-hidden 維持済み)
 *   - 旧 aria-label: "表示日を今日 (M月d日 (eee)) にリセット"
 *   - 問題: visible "今日" は aria-label 内に substring としては含まれるが prefix では無く
 *     voice user 発話「今日」と name 先頭不一致 → WCAG 2.5.3 推奨形に未到達。
 *   iter844-874 で同 pattern 順次適合化済、iter853 で gantt 今日へジャンプ button は
 *   prefix 適合済、本 calendar 今日 button は iter849 で wrap のみ済 prefix 未対応。
 *
 * fix (1 ファイル ~1 行差分):
 *   - aria-label を visible text prefix 形に変更:
 *     - 「今日 (表示日を M月d日 (eee) にリセット)」
 *   - visible "今日" は iter849 で aria-hidden 維持、aria-label の prefix 化のみで適合化
 *     (iter844-874 と一貫、gantt 今日へジャンプ iter853 と並走整合)。
 *
 * 検証: source-side regex assert + iter849/853/874 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const cv = readFileSync(
    resolve(process.cwd(), 'src/components/schedule/calendar-view.tsx'),
    'utf8',
  )

  // 1. calendar-today-btn aria-label prefix
  if (
    /aria-label=\{`今日 \(表示日を \$\{format\(new Date\(\), 'M月d日 \(eee\)'\)\} にリセット\)`\}/.test(
      cv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `calendar-today-btn aria-label visible "今日" prefix OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `calendar-today-btn aria-label prefix NG` })
  }

  // 2. iter849 invariant: visible "今日" aria-hidden 維持
  if (/<span aria-hidden="true">今日<\/span>/.test(cv)) {
    findings.push({
      level: 'info',
      message: `iter849 invariant: calendar-today-btn visible aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter849 invariant: 破壊` })
  }

  // 3. data-testid 維持
  if (/data-testid="calendar-today-btn"/.test(cv)) {
    findings.push({
      level: 'info',
      message: `calendar-today-btn data-testid 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `calendar-today-btn data-testid 破壊` })
  }

  // iter853 invariant: gantt 今日へジャンプ (並走整合)
  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')
  if (
    /aria-label=\{`今日へジャンプ \(Gantt timeline を \$\{format\(new Date\(\), 'M月d日 \(eee\)'\)\} の縦線まで横スクロール\)`\}/.test(
      gv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter853 invariant: gantt 今日へジャンプ aria-label prefix 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter853 invariant: 破壊` })
  }

  // iter874 invariant: quick-add-submit prefix
  const qa = readFileSync(resolve(process.cwd(), 'src/components/workspace/quick-add.tsx'), 'utf8')
  if (/aria-label=\{[\s\S]+?`作成 \(「\$\{preview\.title\}」を作成、Enter でも可\)`/.test(qa)) {
    findings.push({
      level: 'info',
      message: `iter874 invariant: quick-add-submit aria-label prefix 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter874 invariant: 破壊` })
  }

  // iter873 invariant: create-workspace-submit
  const cwf = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/create-workspace-form.tsx'),
    'utf8',
  )
  if (/aria-label=\{[\s\S]+?'作成 \(Workspace を新規作成\)'/.test(cwf)) {
    findings.push({
      level: 'info',
      message: `iter873 invariant: create-workspace-submit aria-label prefix 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter873 invariant: 破壊` })
  }

  // iter850 invariant: bulk-delete
  const bab = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/bulk-action-bar.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">削除<\/span>/.test(bab)) {
    findings.push({
      level: 'info',
      message: `iter850 invariant: bulk-delete "削除" aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter850 invariant: 破壊` })
  }

  console.log(`\n=== Findings (calendar-today-prefix-label-in-name-iter875) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
