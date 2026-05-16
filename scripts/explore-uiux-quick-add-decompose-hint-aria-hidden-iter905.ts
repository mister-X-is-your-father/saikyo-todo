/**
 * Phase 6.15 loop iter 905 (mode-D Desktop a11y) —
 * quick-add の preview decomposeHint chip "AI 分解" を decorative span に変更、
 * inner emoji aria-hidden 統合 → 全体 aria-hidden で wrap、
 * parent aria-label "解析結果: ... AI 分解候補" 単独経路に統一。
 *
 * 経緯: iter903/904 続編 (preview row 全 chip aria-hidden 化)。decomposeHint chip は
 *   inner 🧠 emoji span は既に aria-hidden だが visible "AI 分解" text は aria-hidden 無し
 *   → SR 重複読み上げ。parent aria-label 既に "AI 分解候補" 含む。
 *
 * 修正: span 全体に aria-hidden="true" 追加、内側 nested aria-hidden span 削除して
 *   "🧠 AI 分解" を 1 line 化、parent aria-label 単独経路に統一。
 *
 * 検証: source-side regex assert + iter735/843/849-904 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const qa = readFileSync(resolve(process.cwd(), 'src/components/workspace/quick-add.tsx'), 'utf8')

  // 1. decomposeHint chip 全体 aria-hidden で 1 行統合
  if (
    /<span\s+className="rounded bg-violet-100 px-1\.5 py-0\.5 text-violet-700"\s+aria-hidden="true"\s*>\s*🧠 AI 分解\s*<\/span>/.test(
      qa,
    )
  ) {
    findings.push({
      level: 'info',
      message: `quick-add decomposeHint chip 全体 aria-hidden + emoji 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `quick-add decomposeHint chip 統合 未完了`,
    })
  }

  // iter904 invariant
  if (
    /<span\s+className=\{`rounded px-1\.5 py-0\.5 \$\{PRIO_COLOR\[preview\.priority\]\}`\}\s+aria-hidden="true"/.test(
      qa,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter904 invariant: quick-add 3 chip aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter904 invariant: 破壊` })
  }

  // iter903 invariant
  if (/<span className="truncate font-mono" aria-hidden="true">/.test(qa)) {
    findings.push({
      level: 'info',
      message: `iter903 invariant: quick-add title aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter903 invariant: 破壊` })
  }

  // iter893 invariant
  if (
    /<span aria-hidden="true">→ \{formatEstimate\(calibrated\.calibratedMinutes\)\}<\/span>/.test(
      qa,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter893 invariant: quick-add calibrated chip aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter893 invariant: 破壊` })
  }

  // iter735 invariant
  const tce = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  const tceMatches = tce.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tceMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter735 invariant: team-context-editor aria-keyshortcuts 維持 OK (${tceMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant: 破壊` })
  }

  console.log(`\n=== Findings (quick-add-decompose-hint-aria-hidden-iter905) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
