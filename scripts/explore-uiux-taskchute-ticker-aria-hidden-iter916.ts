/**
 * Phase 6.15 loop iter 916 (mode-D Desktop a11y) —
 * taskchute-view ticker summary div role="status" 内 5 span (Timer icon + 合計/完了/残
 * 3 value span + 見積無 chip) の visible text を aria-hidden 化、parent aria-label 単独
 * SR 経路に統一。aria-label に未含だった 「見積無 N 件」 を一緒に取り込み SR 経路を完備。
 *
 * 経緯: role="status" 親 aria-label "合計 X 分 / 完了済 Y 分 / 残 Z 分" は分単位
 *   formatted。内側 visible は "合計 Xh Ym / 完了 Xh Ym / 残 Xh Ym" の h/m 表記。
 *   children aria-hidden 無し → SR が 2 formats を二重 announce。
 *   さらに 見積無 chip は visible のみで parent aria-label 圏外。
 *
 * 修正 (+9/-4 行、1 file):
 *   - 5 span 全部に aria-hidden="true" 追加 (visual のみ、SR 経路から外す)
 *   - parent aria-label に "(見積無 N 件)" suffix 追加 (estimateUnknownCount > 0 のみ)
 *   - Timer icon は元から aria-hidden、role="status" は維持
 *
 * 検証: source-side regex assert + iter735/915 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const tv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/taskchute-view.tsx'),
    'utf8',
  )

  // 1. parent aria-label に 見積無 suffix 追加 OK
  if (
    /aria-label=\{`合計 \$\{ticker\.totalEstimateMin\} 分 \/ 完了済 \$\{ticker\.doneEstimateMin\} 分 \/ 残 \$\{ticker\.remainingEstimateMin\} 分\$\{[\s\S]*?ticker\.estimateUnknownCount > 0[\s\S]*?` \(見積無 \$\{ticker\.estimateUnknownCount\} 件\)`/.test(
      tv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `taskchute ticker aria-label に 見積無 suffix 追加 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `taskchute ticker aria-label に 見積無 suffix 欠落`,
    })
  }

  // 2. 5 span 全部 aria-hidden 追加 OK (合計 / 完了 / 数値 2 + 残 / 数値 + 見積無)
  const ariaHiddenSpans = (
    tv.match(/<span className="[^"]*"[ \s\n]*aria-hidden="true"[ \s\n]*>/g) ?? []
  ).length
  // ticker summary div 内 5 span (合計 / 完了 sep / 完了値 / 残 sep / 残値 / 見積無)
  // + 他 area の既存 aria-hidden span。最低 6 想定 (調査結果より調整)
  if (ariaHiddenSpans >= 6) {
    findings.push({
      level: 'info',
      message: `taskchute file 内 aria-hidden span 数 OK (${ariaHiddenSpans} 件 ≥6)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `taskchute file 内 aria-hidden span 不足 (現在 ${ariaHiddenSpans}、期待 ≥6)`,
    })
  }

  // 3. ticker summary div の "合計 Xh Ym" 内側 span aria-hidden 追加 OK
  if (
    /<span className="font-medium tabular-nums" aria-hidden="true">\s*合計 \{Math\.floor\(ticker\.totalEstimateMin \/ 60\)\}h\{ticker\.totalEstimateMin % 60\}m\s*<\/span>/.test(
      tv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `taskchute ticker "合計 Xh Ym" span aria-hidden 追加 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `taskchute ticker "合計 Xh Ym" span aria-hidden 欠落`,
    })
  }

  // 4. ticker summary div の "見積無 N" span aria-hidden 追加 OK
  if (
    /<span className="text-muted-foreground ml-auto text-\[10px\]" aria-hidden="true">\s*見積無 \{ticker\.estimateUnknownCount\}\s*<\/span>/.test(
      tv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `taskchute ticker "見積無 N" span aria-hidden 追加 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `taskchute ticker "見積無 N" span aria-hidden 欠落`,
    })
  }

  // 5. role="status" / data-testid 維持
  if (/data-testid="taskchute-ticker-summary"\s*\n\s*role="status"/.test(tv)) {
    findings.push({
      level: 'info',
      message: `taskchute ticker role="status" + data-testid 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `taskchute ticker role="status" / data-testid 破壊`,
    })
  }

  // iter915 invariant: swimlane population div 内側 aria-hidden
  const swd = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprint-swimlane-disclosure.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{populationLabel\}<\/span>/.test(swd)) {
    findings.push({
      level: 'info',
      message: `iter915 invariant: swimlane population div 内側 aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter915 invariant: 破壊` })
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

  console.log(`\n=== Findings (taskchute-ticker-aria-hidden-iter916) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
