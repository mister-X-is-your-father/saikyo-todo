/**
 * Phase 6.15 loop iter 871 (mode-D Desktop a11y) —
 * team-capacity-panel: 3 row div の inner visible text を aria-hidden span で
 * wrap (一括、各 row 3 div = name + 今日 + 今週)。
 *
 * 課題: src/components/workspace/team-capacity-panel.tsx の各 member row には
 *   3 div があり、各 div に aria-label が完全 content を含むのに inner visible
 *   text が aria-hidden 無し → SR 重複読み上げ:
 *     1. name div: aria-label="member: ${name}" + visible {name}
 *     2. 今日 div: aria-label="今日: ${load}" + visible "今日 ${load}"
 *     3. 今週 div: aria-label="今週: ${load}" + visible "今週 ${load}"
 *
 * fix (1 file ~3 spot):
 *   - name: <span aria-hidden="true">{name}</span>
 *   - 今日: 「今日」 + formatJa を各 span aria-hidden
 *   - 今週: 「今週」 + formatJa を各 span aria-hidden
 *   各々 aria-label 単独経路に統一、機能不変、視覚 layout 不変、shadcn 編集なし
 *   (team-capacity-panel.tsx は project-specific component)。
 *   iter800-870 sweep の続編 (data row の inner aria-hidden 適用)
 *
 * 検証: source-side regex assert + iter735/869/870 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const tcp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-capacity-panel.tsx'),
    'utf8',
  )

  if (
    /aria-label=\{`member: \$\{name\}`\}>\s*<span aria-hidden="true">\{name\}<\/span>/.test(tcp)
  ) {
    findings.push({
      level: 'info',
      message: `team-capacity name div inner aria-hidden 統合 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `team-capacity name aria-hidden 未統合` })
  }

  // 今日 + 今週 の 「今日」/「今週」 span aria-hidden
  const dayLabelMatches = tcp.match(
    /<span className="text-muted-foreground mr-1" aria-hidden="true">\s*(?:今日|今週)\s*<\/span>/g,
  )
  if (dayLabelMatches && dayLabelMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `team-capacity 今日 + 今週 label span aria-hidden 統合 OK (${dayLabelMatches.length} 箇所)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `team-capacity 今日/今週 label span aria-hidden 未統合 or 件数不足 (${dayLabelMatches?.length ?? 0})`,
    })
  }

  // formatMemberCapacityLoadJa span aria-hidden
  const formatMatches = tcp.match(
    /<span aria-hidden="true">\{formatMemberCapacityLoadJa\((?:today|week)\)\}<\/span>/g,
  )
  if (formatMatches && formatMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `team-capacity formatMemberCapacityLoadJa span aria-hidden 統合 OK (${formatMatches.length} 箇所)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `team-capacity formatMemberCapacityLoadJa span aria-hidden 未統合 (${formatMatches?.length ?? 0})`,
    })
  }

  // aria-label 維持
  if (
    /aria-label=\{`member: \$\{name\}`\}/.test(tcp) &&
    /aria-label=\{`今日: \$\{formatMemberCapacityLoadJa\(today\)\}`\}/.test(tcp) &&
    /aria-label=\{`今週: \$\{formatMemberCapacityLoadJa\(week\)\}`\}/.test(tcp)
  ) {
    findings.push({
      level: 'info',
      message: `team-capacity 3 aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `team-capacity aria-label 破壊` })
  }

  // iter870 invariant: workspace top nav 「← 一覧」 1 span
  const wp = readFileSync(
    resolve(process.cwd(), 'src/app/(workspace)/[workspaceId]/page.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">← 一覧<\/span>/.test(wp)) {
    findings.push({
      level: 'info',
      message: `iter870 invariant: workspace top nav 一覧 1 span aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter870 invariant: 破壊` })
  }

  // iter735 invariant: team-context-editor aria-keyshortcuts
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

  console.log(`\n=== Findings (team-capacity-aria-hidden-iter871) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
