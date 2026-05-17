/**
 * Phase 6.15 loop iter 912 (mode-D Desktop a11y) —
 * sprints-panel 内 SprintCard 「理想ライン」decorative div の
 * `aria-hidden="true"` + `aria-label="理想ライン X%"` 同居 anti-pattern を除去
 * (aria-hidden=true な要素の aria-label は SR が読まないため dead code)。
 *
 * 経緯: 探索で `grep -rEn 'aria-hidden="true"' -A1 | grep 'aria-label'` 全 src/components/
 *   サーベイ → 全 codebase で 1 件のみ抽出。Sprint progressbar 上の elapsed % indicator は
 *   兄弟 div (role="group" aria-label "期間進捗 経過 X / Y 日 (Z%)、残 W 日") が同 % を
 *   SR に伝えるため、ideal 線 div の独立 SR 表現は不要 (parent progressbar の
 *   aria-valuetext と sibling group で十分)。
 *
 * 修正: aria-label のみ削除、aria-hidden="true" は装飾性質を維持。
 *   コメントに「sibling 期間進捗が経過 % を伝える」根拠を 1 行で残置。
 *
 * 検証: source-side regex assert (anti-pattern 解消 + sibling SR path 維持) +
 *   iter735/843/849-911 invariant cross-check (selective、最新 chain のみ)。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )

  // 1. anti-pattern 除去 (aria-hidden + aria-label 同居)
  if (/aria-label=\{`理想ライン \$\{elapsedPct\}%`\}/.test(sp)) {
    findings.push({
      level: 'warning',
      message: `sprints-panel ideal line aria-label dead code 残存 (aria-hidden=true で SR 不可達)`,
    })
  } else {
    findings.push({
      level: 'info',
      message: `sprints-panel ideal line aria-label dead code 除去 OK`,
    })
  }

  // 2. aria-hidden は装飾性質維持
  if (/style=\{\{ left: `\$\{elapsedPct\}%` \}\}\s*\n\s*aria-hidden="true"\s*\n\s*\/>/.test(sp)) {
    findings.push({
      level: 'info',
      message: `sprints-panel ideal line aria-hidden 維持 OK (装飾性質)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprints-panel ideal line aria-hidden 破壊`,
    })
  }

  // 3. sibling 「期間進捗」 SR 経路維持 (経過 % を SR に伝える)
  if (
    /aria-label=\{`Sprint「\$\{sprint\.name\}」期間進捗 経過 \$\{elapsedDays\} \/ \$\{totalDays\} 日 \(\$\{elapsedPct\}%\)、残 \$\{remainingDays\} 日`\}/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `sprints-panel 「期間進捗」 sibling div aria-label 維持 OK (経過 % SR 経路保全)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprints-panel 「期間進捗」 sibling div aria-label 破壊`,
    })
  }

  // 4. parent progressbar aria-label 維持
  if (
    /aria-label=\{`Sprint「\$\{sprint\.name\}」完了率 \$\{pct\}% \(\$\{done\}\/\$\{total\} 件、\$\{sprintProgressToneLabel\(tone\)\}\)`\}/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `sprints-panel progressbar aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprints-panel progressbar aria-label 破壊`,
    })
  }

  // iter911 invariant: estimate-bias 3 div aria-hidden
  const ebi = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/estimate-bias-insight.tsx'),
    'utf8',
  )
  if ((ebi.match(/<div aria-hidden="true">\s*<dt>/g) ?? []).length >= 3) {
    findings.push({
      level: 'info',
      message: `iter911 invariant: estimate-bias 3 div aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter911 invariant: 破壊` })
  }

  // iter735 invariant: team-context-editor keyshortcuts
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

  console.log(`\n=== Findings (sprint-ideal-line-aria-iter912) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
