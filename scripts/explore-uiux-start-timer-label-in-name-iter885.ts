/**
 * Phase 6.15 loop iter 885 (mode-D Desktop a11y) —
 * start-timer-button (StartTimerButton) の aria-label を WCAG 2.5.3 (Label in Name)
 * 適合形に変更。3 case (no-other / otherActive compact / otherActive normal) すべて対応。
 *
 * 課題: src/components/workspace/start-timer-button.tsx の start-timer button:
 *   - normal (no other): visible "計測開始" は旧 aria-label "「${title}」のタイマーを開始" の
 *     "タイマーを開始" と乖離 → 「計測開始」 token 不含 → WCAG 2.5.3 違反。
 *   - otherActive compact: visible "切替して開始" / 旧 aria-label "「${activeTitle}」のタイマーを
 *     停止して「${item.title}」の計測を開始" → 「切替して開始」 token 不含。
 *   - otherActive normal: visible "別 Item を停止して計測開始" / 旧 aria-label "「${activeTitle}」
 *     のタイマーを停止して「${item.title}」の計測を開始" → "計測を開始" には "を" 挿入で乖離。
 *   いずれも音声「計測開始」「切替して開始」「別 Item を停止して計測開始」が hit せず。
 *   iter834 で visible aria-hidden 統合済だが aria-label の token 配置乖離は未対応。
 *
 * fix (1 ファイル / +5-2 行差分、3 case 一括):
 *   - aria-label normal: `計測開始 (「${title}」のタイマー開始)` → visible prefix 適合
 *   - aria-label otherActive compact: `切替して開始 (「${activeTitle}」のタイマーを停止 → 「${title}」の計測開始)`
 *   - aria-label otherActive normal: `別 Item を停止して計測開始 (「${activeTitle}」のタイマー停止 → 「${title}」の計測開始)`
 *
 * 検証: source-side regex assert + iter883/884 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const st = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/start-timer-button.tsx'),
    'utf8',
  )

  // 1. normal aria-label に visible "計測開始" prefix
  if (/`計測開始 \(「\$\{item\.title\}」のタイマー開始\)`/.test(st)) {
    findings.push({
      level: 'info',
      message: `start-timer normal aria-label に "計測開始" prefix 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `start-timer normal aria-label が "計測開始" prefix 不含`,
    })
  }

  // 2. otherActive compact aria-label に visible "切替して開始" prefix
  if (
    /`切替して開始 \(「\$\{activeItemTitle\}」のタイマーを停止 → 「\$\{item\.title\}」の計測開始\)`/.test(
      st,
    )
  ) {
    findings.push({
      level: 'info',
      message: `start-timer otherActive compact aria-label に "切替して開始" prefix 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `start-timer otherActive compact aria-label が "切替して開始" prefix 不含`,
    })
  }

  // 3. otherActive normal aria-label に visible "別 Item を停止して計測開始" prefix
  if (
    /`別 Item を停止して計測開始 \(「\$\{activeItemTitle\}」のタイマー停止 → 「\$\{item\.title\}」の計測開始\)`/.test(
      st,
    )
  ) {
    findings.push({
      level: 'info',
      message: `start-timer otherActive normal aria-label に "別 Item を停止して計測開始" prefix 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `start-timer otherActive normal aria-label prefix 不含`,
    })
  }

  // 4. 旧 aria-label "「${title}」のタイマーを開始" 削除
  if (!/`「\$\{item\.title\}」のタイマーを開始`/.test(st)) {
    findings.push({
      level: 'info',
      message: `start-timer 旧 aria-label "「{title}」のタイマーを開始" 削除済 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `start-timer 旧 aria-label 残存`,
    })
  }

  // 5. iter834 invariant: visible aria-hidden 維持
  if (/<span aria-hidden="true">\{visibleLabel\}<\/span>/.test(st)) {
    findings.push({
      level: 'info',
      message: `iter834 invariant: start-timer visible aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter834 invariant: start-timer visible 破壊` })
  }

  // iter884 invariant: heartbeat pending aria-label
  const hb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/heartbeat-button.tsx'),
    'utf8',
  )
  if (/'スキャン中… \(Heartbeat MUST item の期限スキャン実行中\)'/.test(hb)) {
    findings.push({
      level: 'info',
      message: `iter884 invariant: heartbeat pending aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter884 invariant: heartbeat 破壊` })
  }

  console.log(`\n=== Findings (start-timer-label-in-name-iter885) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
