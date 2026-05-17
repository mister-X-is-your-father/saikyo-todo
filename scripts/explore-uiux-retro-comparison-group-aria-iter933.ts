/**
 * Phase 6.15 loop iter 933 (mode-D Desktop a11y) —
 * sprint-retro-widget 前 Sprint 比較 div に role="group" + aria-label 追加、
 * 内側 visible 2 span を aria-hidden 化、SR 経路を 1 つに集約。
 *
 * 経緯: 前 Sprint 比較 div は plain visible text (icon + "前 Sprint 比 改善" + 完了率 / 納品 delta)
 *   のみ、role / aria-label 無し。SR は landmark / group nav で skip、AT が
 *   「ここに比較情報がある」 と認識しにくい。完了率と納品の delta は数値 + 単位 +
 *   符号で構成されるため、aria-label に "(改善/悪化/横ばい)" + 詳細 を集約して
 *   一発で SR に届ける方が UX 良い。
 *
 * 修正 (+5/-1 行、1 file):
 *   - div に role="group" + aria-label "前 Sprint 比 ${trend}: 完了率 ${pt}pt / 納品 ${件}" 追加
 *   - 内側 visible 2 span に aria-hidden="true" 追加 (二重読み防止)
 *   - trendIcon (aria-hidden 既存) は維持
 *
 * 検証: source-side regex assert + iter735/932 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const srw = readFileSync(
    resolve(process.cwd(), 'src/components/sprint/sprint-retro-widget.tsx'),
    'utf8',
  )

  // 1. retro-comparison div に role="group" 追加 OK
  if (/data-testid="retro-comparison"\s*\n\s*role="group"/.test(srw)) {
    findings.push({
      level: 'info',
      message: `retro-comparison div role="group" 追加 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `retro-comparison div role="group" 欠落`,
    })
  }

  // 2. retro-comparison div に aria-label 追加 OK
  if (
    /aria-label=\{`前 Sprint 比 \$\{trendLabel\(cmp\.trend\)\}: 完了率 \$\{cmp\.completionDelta > 0 \? '\+' : ''\}\$\{cmp\.completionDelta\}pt \/ 納品 \$\{cmp\.doneDelta > 0 \? '\+' : ''\}\$\{cmp\.doneDelta\} 件`\}/.test(
      srw,
    )
  ) {
    findings.push({
      level: 'info',
      message: `retro-comparison div aria-label 追加 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `retro-comparison div aria-label 欠落`,
    })
  }

  // 3. 内側 2 span aria-hidden 追加 OK
  if (
    /<span className="font-medium" aria-hidden="true">\s*前 Sprint 比 \{trendLabel\(cmp\.trend\)\}\s*<\/span>/.test(
      srw,
    ) &&
    /<span className="text-muted-foreground tabular-nums" aria-hidden="true">/.test(srw)
  ) {
    findings.push({
      level: 'info',
      message: `retro-comparison 内側 2 span aria-hidden 追加 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `retro-comparison 内側 2 span aria-hidden 欠落`,
    })
  }

  // iter932 invariant: risk-board td title 削除
  const srbw = readFileSync(
    resolve(process.cwd(), 'src/components/sprint/sprint-risk-board-widget.tsx'),
    'utf8',
  )
  if (!/title=\{load\.id\}/.test(srbw)) {
    findings.push({
      level: 'info',
      message: `iter932 invariant: risk-board td title 削除 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter932 invariant: 破壊` })
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

  console.log(`\n=== Findings (retro-comparison-group-aria-iter933) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
