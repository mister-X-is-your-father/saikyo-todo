/**
 * Phase 6.15 loop iter 876 (mode-D Desktop a11y) —
 * active-timer-panel Stop button: WCAG 2.5.3 (Label in Name) prefix 適合 (iter846 続き)。
 *
 * 課題: src/components/workspace/active-timer-panel.tsx の active-timer-stop:
 *   - visible: "停止" (iter846 で aria-hidden 維持済み)
 *   - 旧 aria-label: "タイマーを停止して稼働記録に保存" / "タイマーを停止して稼働記録を
 *     作成中…"
 *   - 問題: visible "停止" は aria-label 内 substring としては含まれるが prefix では無く
 *     voice user 発話「停止」と name 先頭不一致 → WCAG 2.5.3 推奨形に未到達。
 *   iter844-875 で同 pattern 順次適合化済、本 button は iter846 で wrap のみ済 prefix
 *   未対応。右下 fixed active-timer-panel は最頻 navigation control。
 *
 * fix (1 ファイル ~2 行差分):
 *   - aria-label を visible "停止" prefix 形に変更:
 *     - 通常: 「停止 (タイマーを停止して稼働記録に保存)」
 *     - pending: 「停止 中… (タイマーを停止して稼働記録を作成中)」
 *   - visible "停止" は iter846 で aria-hidden 維持、aria-label の prefix 化のみで適合化
 *     (iter844-875 と一貫)。
 *
 * 検証: source-side regex assert + iter846/850/873/874/875 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const at = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/active-timer-panel.tsx'),
    'utf8',
  )

  // 1. active-timer-stop aria-label prefix
  if (
    /aria-label=\{[\s\S]+?'停止 \(タイマーを停止して稼働記録に保存\)'/.test(at) &&
    /aria-label=\{[\s\S]+?'停止 中… \(タイマーを停止して稼働記録を作成中\)'/.test(at)
  ) {
    findings.push({
      level: 'info',
      message: `active-timer-stop aria-label visible "停止" prefix (通常 + pending) OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `active-timer-stop aria-label NG` })
  }

  // 2. iter846 invariant: visible "停止" aria-hidden 維持
  if (/<span aria-hidden="true">停止<\/span>/.test(at)) {
    findings.push({
      level: 'info',
      message: `iter846 invariant: active-timer-stop visible "停止" aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter846 invariant: 破壊` })
  }

  // 3. data-testid 維持
  if (/data-testid="active-timer-stop"/.test(at)) {
    findings.push({
      level: 'info',
      message: `active-timer-stop data-testid 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `active-timer-stop data-testid 破壊` })
  }

  // iter875 invariant: calendar-today-btn
  const cv = readFileSync(
    resolve(process.cwd(), 'src/components/schedule/calendar-view.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`今日 \(表示日を \$\{format\(new Date\(\), 'M月d日 \(eee\)'\)\} にリセット\)`\}/.test(
      cv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter875 invariant: calendar-today-btn aria-label prefix 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter875 invariant: 破壊` })
  }

  // iter874 invariant: quick-add-submit
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

  console.log(`\n=== Findings (active-timer-stop-prefix-label-in-name-iter876) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
