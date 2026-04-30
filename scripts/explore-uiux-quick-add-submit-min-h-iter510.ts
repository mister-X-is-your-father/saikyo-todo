/**
 * Phase 6.15 loop iter 510 (mode-D Desktop a11y / Mobile WCAG 2.5.5 AAA) —
 * QuickAdd 作成 submit Button を 44x44 化、codify。
 *
 * 課題: src/components/workspace/quick-add.tsx 行 154-170 の submit Button が
 *   default size (h-9 = 36px) で `className="min-h-11"` 漏れ。WCAG 2.5.5 AAA 違反。
 *
 *   QuickAdd は workspace 起動後に一番頻繁に使われる core UI で submit button が
 *   mobile 36px は誤タップしやすい。
 *
 * fix (1 ファイル 1 行追加):
 *   - `<Button type="button" ...>` に `className="min-h-11"` 挿入
 *
 * 機能不変、shadcn 編集なし、aria-label / data-testid / disabled state 維持。
 *
 * 検証: source-side regex assert + iter509 invariant (StartTimerButton min-h-11) 維持。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const path = 'src/components/workspace/quick-add.tsx'
  const src = readFileSync(resolve(process.cwd(), path), 'utf8')

  // 1. submit Button に className="min-h-11" 配線
  if (
    /<Button\s+type="button"\s+className="min-h-11"\s+onClick=\{\(\) => void submit\(\)\}/.test(src)
  ) {
    findings.push({ level: 'info', message: `${path}: submit Button min-h-11 配線 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: submit Button min-h-11 配線 不在` })
  }

  // 2. data-testid="quick-add-submit" 維持
  if (/data-testid="quick-add-submit"/.test(src)) {
    findings.push({ level: 'info', message: `${path}: data-testid 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: data-testid 破壊` })
  }

  // 3. disabled state (3 条件) + aria-label 維持
  if (
    /disabled=\{create\.isPending \|\| !preview\?\.title \|\| \(preview\?\.isMust \?\? false\)\}/.test(
      src,
    ) &&
    /タスクを作成するにはタイトルを入力してください/.test(src)
  ) {
    findings.push({
      level: 'info',
      message: `${path}: disabled state + aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `${path}: disabled state / aria-label 破壊` })
  }

  // 4. iter509 invariant: StartTimerButton min-h-11 維持
  const stPath = 'src/components/workspace/start-timer-button.tsx'
  const stSrc = readFileSync(resolve(process.cwd(), stPath), 'utf8')
  if (
    /<Button[\s\S]{0,300}?size=\{isCompact \? 'sm' : 'default'\}[\s\S]{0,200}?className="min-h-11"/.test(
      stSrc,
    )
  ) {
    findings.push({
      level: 'info',
      message: `${stPath}: iter509 invariant (StartTimerButton min-h-11) 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `${stPath}: iter509 invariant 破壊` })
  }

  // 5. quick-add-input + quick-add-preview の aria-* 維持 (regression)
  if (
    /id="quick-add-input"/.test(src) &&
    /id="quick-add-preview"/.test(src) &&
    /role="status"\s*\n?\s*aria-live="polite"/.test(src)
  ) {
    findings.push({
      level: 'info',
      message: `${path}: quick-add-input + preview aria 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `${path}: quick-add input / preview aria 破壊` })
  }

  console.log(`\n=== Findings (quick-add-submit-min-h-iter510) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
