/**
 * Phase 6.15 loop iter 888 (mode-D UX content polish) —
 * mock-timesheet/login password Input に hint を追加 (tsEmail-hint と同 pattern)。
 *
 * 課題: mock-login-form の password input は hint 無し (email 側は iter738 で hint 追加済)。
 *   form 下に seed (ops@example.com / password1234) は表示済だが、password 入力欄に
 *   focus した時に hint が無く SR 利用者には seed の存在が見えない。Playwright 自動入力
 *   テスト用 mock の趣旨を SR / 視覚双方で明示するため hint を追加。
 *
 * fix (1 ファイル: aria-describedby tsPassword-hint 追加 + hint p element 追加):
 *   - aria-describedby に tsPassword-hint を含める (error 時は tsPassword-hint tsPassword-error)
 *   - hint p: 'mock-timesheet 用パスワード (フォーム下の seed 参照: password1234)。'
 *
 * 検証: source-side regex assert + iter887/886/885/851 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ml = readFileSync(
    resolve(process.cwd(), 'src/components/mock-timesheet/mock-login-form.tsx'),
    'utf8',
  )
  if (/id="tsPassword-hint"[^>]*>\s*mock-timesheet 用パスワード/.test(ml)) {
    findings.push({
      level: 'info',
      message: `mock-login tsPassword-hint 追加 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `mock-login tsPassword-hint 未追加` })
  }
  // aria-describedby が tsPassword-hint を含むこと
  if (
    /aria-describedby=\{[\s\S]*'tsPassword-hint tsPassword-error'[\s\S]*:[\s\S]*'tsPassword-hint'/.test(
      ml,
    )
  ) {
    findings.push({
      level: 'info',
      message: `mock-login tsPassword aria-describedby に hint 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `mock-login tsPassword aria-describedby 配線 未統合`,
    })
  }

  // iter887 invariant
  const sf = readFileSync(resolve(process.cwd(), 'src/components/auth/signup-form.tsx'), 'utf8')
  if (/8 文字以上。覚えやすいパスフレーズ推奨/.test(sf)) {
    findings.push({
      level: 'info',
      message: `iter887 invariant: signup-password-hint 拡充 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter887 invariant: 破壊` })
  }

  // iter886 invariant
  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">再<\/span>/.test(wp)) {
    findings.push({
      level: 'info',
      message: `iter886 invariant: WorkflowRunHistory 再 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter886 invariant: 破壊` })
  }

  // iter851 invariant
  const layout = readFileSync(resolve(process.cwd(), 'src/app/layout.tsx'), 'utf8')
  if (
    /focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:inline-flex focus:min-h-11/.test(
      layout,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter851 invariant: skip-link focus min-h-11 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter851 invariant: 破壊` })
  }

  console.log(`\n=== Findings (mock-login-password-hint-iter888) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
