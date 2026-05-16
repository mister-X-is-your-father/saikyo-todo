/**
 * Phase 6.15 loop iter 906 (mode-D Desktop a11y) —
 * weekly-insight-widget の CardTitle 内 3 chip (hint / best-day / worst-day) を
 * decorative aria-hidden 化、parent Card aria-label "週次 Insight (${hint}): ..."
 * 単独経路に統一。
 *
 * 経緯: iter903-905 quick-add preview row sweep の続編 (parent aria-label が内側 chip 全て
 *   集約しているのに inner visible 重複)。weekly-insight-widget の CardTitle 内 3 chip も
 *   parent Card aria-label に既に "${hint.label} ... bestDayLabel ... worstDayAriaPart"
 *   含まれるが、内側 visible aria-hidden 無し → 重複読み上げ。
 *
 * 修正: 3 chip span に aria-hidden="true" 追加 + 内側 emoji nested span を 1 行統合。
 *
 * 検証: source-side regex assert + iter735/843/849-905 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const wiw = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/weekly-insight-widget.tsx'),
    'utf8',
  )

  // 1. hint chip aria-hidden
  if (
    /data-testid="weekly-insight-hint"[\s\S]+?aria-hidden="true"[\s\S]+?>\s*\{hint\.label\}/.test(
      wiw,
    )
  ) {
    findings.push({
      level: 'info',
      message: `weekly-insight hint chip aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `weekly-insight hint chip aria-hidden 未統合`,
    })
  }

  // 2. best-day chip aria-hidden + emoji 統合
  if (
    /data-testid="weekly-insight-best-day"[\s\S]+?aria-hidden="true"[\s\S]+?>\s*⭐ \{bestDayLabel\}/.test(
      wiw,
    )
  ) {
    findings.push({
      level: 'info',
      message: `weekly-insight best-day chip aria-hidden + emoji 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `weekly-insight best-day chip 統合 未完了`,
    })
  }

  // 3. worst-day chip aria-hidden + emoji 統合
  if (
    /data-testid="weekly-insight-worst-day"[\s\S]+?aria-hidden="true"[\s\S]+?>\s*\{worstDay\.current === 0 \? '😴' : '⚠'\} \{formatWorstDayJa\(worstDay\)\}/.test(
      wiw,
    )
  ) {
    findings.push({
      level: 'info',
      message: `weekly-insight worst-day chip aria-hidden + emoji 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `weekly-insight worst-day chip 統合 未完了`,
    })
  }

  // 4. parent Card aria-label 維持
  if (/aria-label=\{`週次 Insight \(\$\{hint\.label\}\)[\s\S]+?bestDayLabel/.test(wiw)) {
    findings.push({
      level: 'info',
      message: `weekly-insight Card aria-label 完全 content 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `weekly-insight Card aria-label 破壊`,
    })
  }

  // iter905 invariant
  const qa = readFileSync(resolve(process.cwd(), 'src/components/workspace/quick-add.tsx'), 'utf8')
  if (
    /<span\s+className="rounded bg-violet-100 px-1\.5 py-0\.5 text-violet-700"\s+aria-hidden="true"/.test(
      qa,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter905 invariant: quick-add decomposeHint chip aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter905 invariant: 破壊` })
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

  console.log(`\n=== Findings (weekly-insight-chips-aria-hidden-iter906) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
