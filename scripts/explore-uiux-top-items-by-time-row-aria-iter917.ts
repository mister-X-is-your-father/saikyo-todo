/**
 * Phase 6.15 loop iter 917 (mode-D Desktop a11y) —
 * top-items-by-time-chip top N row 内 2 span (合計時間 + entryCount) の
 * visible text を aria-hidden 化、parent aria-label 単独 SR 経路に統一
 * (iter900/902/904/914/915 pattern を稼働 dashboard top-list row に展開)。
 *
 * 経緯: 2 span とも parent aria-label が完全 content を持つにも関わらず内側
 *   visible text aria-hidden 無し → SR が 2 経路で重複 announce:
 *   - 合計 span: aria-label "合計 ${label}" + 内側 {label} (= label の subset)
 *   - count span: aria-label "${entryCount} 件" + 内側 "${entryCount} 件" (= 完全重複)
 *
 * 修正 (+2/-2 行、1 file): 2 span 内側 visible 文字列を <span aria-hidden="true">
 *   で wrap。parent aria-label / className 維持 (a11y tree + visual 両経路保全)。
 *
 * 検証: source-side regex assert + iter735/916 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ti = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/top-items-by-time-chip.tsx'),
    'utf8',
  )

  // 1. 合計 span 内側 aria-hidden 追加 OK
  if (
    /<span className="font-mono tabular-nums" aria-label=\{`合計 \$\{label\}`\}>\s*<span aria-hidden="true">\{label\}<\/span>\s*<\/span>/.test(
      ti,
    )
  ) {
    findings.push({
      level: 'info',
      message: `top-items 合計 span 内側 aria-hidden 追加 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `top-items 合計 span 内側 aria-hidden 欠落`,
    })
  }

  // 2. count span 内側 aria-hidden 追加 OK
  if (
    /aria-label=\{`\$\{row\.entryCount\} 件`\}\s*>\s*<span aria-hidden="true">\{row\.entryCount\} 件<\/span>/.test(
      ti,
    )
  ) {
    findings.push({
      level: 'info',
      message: `top-items count span 内側 aria-hidden 追加 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `top-items count span 内側 aria-hidden 欠落`,
    })
  }

  // 3. ol aria-label 維持
  if (
    /aria-label=\{`直近 \$\{WINDOW_DAYS\} 日 Item 別稼働 top \$\{summary\.top\.length\} 件 \(合計時間が多い順\)`\}/.test(
      ti,
    )
  ) {
    findings.push({
      level: 'info',
      message: `top-items ol aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `top-items ol aria-label 破壊`,
    })
  }

  // 4. trend chip + streak chip 既存 aria-hidden 維持
  if (
    /<span aria-hidden="true" className="font-mono">\s*\{toneGlyph\}/.test(ti) &&
    /<span aria-hidden="true">\{summary\.streakLine\}<\/span>/.test(ti)
  ) {
    findings.push({
      level: 'info',
      message: `top-items trend / streak chip 既存 aria-hidden 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `top-items trend / streak chip 既存 aria-hidden 破壊`,
    })
  }

  // iter916 invariant: taskchute ticker 見積無 suffix
  const tv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/taskchute-view.tsx'),
    'utf8',
  )
  if (
    /ticker\.estimateUnknownCount > 0 \? ` \(見積無 \$\{ticker\.estimateUnknownCount\} 件\)`/.test(
      tv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter916 invariant: taskchute ticker aria-label 見積無 suffix 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter916 invariant: 破壊` })
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

  console.log(`\n=== Findings (top-items-by-time-row-aria-iter917) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
