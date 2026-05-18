/**
 * Phase 6.15 loop iter 968 (mode-M Mobile) — goals-panel KR (Key Result) 追加 form の
 * 3 input (KR タイトル / 目標値 / 単位) に enterKeyHint="next"/"next"/"send" を追加。
 * iter949-967 enterKeyHint sweep 13 form 目、KR 追加 form 補完。
 *
 * 課題: goals-panel KR 追加 form は 3 input + 1 select で構成されるが enterKeyHint
 *   未指定で Mobile keyboard 上で「次の field か submit か」 user 判別不能。iter961
 *   で Goal 自体の form は enterKeyHint 適用済だが、KR add form は別 sub-form だった
 *   ため漏れ。
 *
 * fix: goals-panel.tsx で
 *   1. krTitle (IMEInput) に enterKeyHint="next" (KR タイトル → mode select へ)
 *   2. target (Input type=number, mode=manual 時のみ) に enterKeyHint="next" (目標値 → 単位 へ)
 *   3. unit (Input, mode=manual 時のみ) に enterKeyHint="send" (単位 → KR 追加 submit)
 *   mode select は enterKeyHint 非適用。
 *   +3/-0 行 (1 file)。視覚 / 動作不変。
 *
 * 機能追加なし、shadcn 編集なし、影響面 1 ファイル。
 *
 * 検証: source-side regex で codify。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const target = 'src/components/workspace/goals-panel.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  // 1. kr-title-input enterKeyHint="next"
  const titleCtx = src.slice(
    src.indexOf('data-testid={`kr-title-input-'),
    src.indexOf('data-testid={`kr-title-input-') + 800,
  )
  if (!/enterKeyHint="next"/.test(titleCtx)) {
    findings.push({
      level: 'warning',
      message: `${target}: KR タイトル input に enterKeyHint="next" 不在`,
    })
  } else {
    findings.push({ level: 'info', message: `KR タイトル enterKeyHint="next" OK` })
  }

  // 2. target Input に enterKeyHint="next"
  const targetCtx = src.slice(
    src.indexOf('placeholder="例: 100"'),
    src.indexOf('placeholder="例: 100"') + 800,
  )
  if (!/enterKeyHint="next"/.test(targetCtx)) {
    findings.push({
      level: 'warning',
      message: `${target}: 目標値 input に enterKeyHint="next" 不在`,
    })
  } else {
    findings.push({ level: 'info', message: `目標値 enterKeyHint="next" OK` })
  }

  // 3. unit Input に enterKeyHint="send"
  const unitCtx = src.slice(
    src.indexOf('placeholder="例: 件 / %"'),
    src.indexOf('placeholder="例: 件 / %"') + 800,
  )
  if (!/enterKeyHint="send"/.test(unitCtx)) {
    findings.push({
      level: 'warning',
      message: `${target}: 単位 input に enterKeyHint="send" 不在`,
    })
  } else {
    findings.push({ level: 'info', message: `単位 enterKeyHint="send" OK` })
  }

  // iter961 invariant: goals-panel 親 Goal form enterKeyHint
  const goalTitleCtx = src.slice(
    Math.max(0, src.indexOf('id="goal-title"') - 50),
    src.indexOf('id="goal-title"') + 600,
  )
  if (!/enterKeyHint="next"/.test(goalTitleCtx)) {
    findings.push({ level: 'warning', message: `iter961 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter961 invariant OK` })
  }

  // iter967 invariant: decompose-proposals enterKeyHint
  const decomposeSrc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (!/enterKeyHint="next"/.test(decomposeSrc) || !/enterKeyHint="send"/.test(decomposeSrc)) {
    findings.push({ level: 'warning', message: `iter967 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter967 invariant OK` })
  }

  // iter735 invariant
  const tce = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  const tceMatches = tce.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tceMatches.length >= 2) {
    findings.push({ level: 'info', message: `iter735 invariant OK (${tceMatches.length} 箇所)` })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant 破壊` })
  }

  console.log(`\n=== Findings (goals-kr-enter-key-hint-iter968) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
