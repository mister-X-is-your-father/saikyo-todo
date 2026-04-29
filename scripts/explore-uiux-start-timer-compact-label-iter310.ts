/**
 * Phase 6.15 loop iter 310 — StartTimerButton (size='sm') の otherActive ラベル
 * 短縮で Today / Backlog 行の幅を保護。
 *
 * 課題: iter249 で size='sm' / 'default' を切替できる button を作り iter250 で
 *   Today / Backlog 行に size='sm' で配置したが、`otherActive=true` (= 別 Item で
 *   既に timer 計測中) のときの visible label が 12 文字超 "別 Item を停止して計測開始"
 *   で、行幅を圧迫 / 折返しで layout 崩れの原因に。
 *
 * fix: compact 時のみ visible label を「切替して開始」に短縮、aria-label は full hint
 *   ("「<前 Item>」のタイマーを停止して「<新 Item>」の計測を開始") を維持、
 *   `title` 属性で hover tooltip 化。WCAG 2.5.3 (Label in Name, Level A) 適合性は
 *   「切替して開始」が「停止して...計測を開始」の prefix 部分一致で維持。
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
  const target = 'src/components/workspace/start-timer-button.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  // 短縮 label が compact branch に存在
  if (!/isCompact \?\s*'切替して開始'/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: '切替して開始' compact 短縮 label 不在`,
    })
  } else {
    findings.push({ level: 'info', message: `${target}: compact 短縮 label OK` })
  }

  // full hint は両 path (otherActive true / false) を網羅
  if (!/「\$\{activeItemTitle\}」のタイマーを停止して「\$\{item\.title\}」の計測を開始/.test(src)) {
    findings.push({ level: 'warning', message: `${target}: full hint (otherActive) 不在` })
  }

  // title 属性で hover tooltip 化
  if (!/title=\{otherActive \? fullHint : undefined\}/.test(src)) {
    findings.push({ level: 'warning', message: `${target}: title attr (hover tooltip) 不在` })
  }

  // 旧長文 visible label が default mode で残存
  if (!/'別 Item を停止して計測開始'/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: default size 用の長文 visible label が消失`,
    })
  }

  console.log(`\n=== Findings (start-timer-compact-label-iter310) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
