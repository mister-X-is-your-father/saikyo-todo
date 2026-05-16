/**
 * Phase 6.15 loop iter 872 (mode-D Desktop a11y) —
 * team-capacity-panel <summary> disclosure visible text を aria-hidden span で
 * wrap (iter871 の続編、同 file 別 spot)。
 *
 * 課題: src/components/workspace/team-capacity-panel.tsx の <summary>
 *   disclosure (チームメンバー 余裕時間 を開く/閉じる) は aria-label が
 *   完全 content を含むのに visible text "チームメンバー 余裕時間 (今日 / 今週)"
 *   は aria-hidden 無し → SR 重複読み上げ。
 *   iter871 (data row 3 div の inner aria-hidden) の続編。
 *
 * fix (1 file ~1 spot):
 *   - <summary> 内 visible "チームメンバー 余裕時間 (今日 / 今週)" を
 *     <span aria-hidden="true"> で wrap、aria-label 単独経路に統一
 *   - 機能不変、視覚 layout 不変、shadcn 編集なし
 *
 * 検証: source-side regex assert + iter735/870/871 invariant cross-check。
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
  if (/<span aria-hidden="true">チームメンバー 余裕時間 \(今日 \/ 今週\)<\/span>/.test(tcp)) {
    findings.push({
      level: 'info',
      message: `team-capacity summary visible text aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `team-capacity summary visible text aria-hidden 未統合`,
    })
  }
  if (
    /aria-label=\{[\s\S]+?'チームメンバー 余裕時間 \(今日 \/ 今週\) を閉じる'/.test(tcp) &&
    /aria-label=\{[\s\S]+?'チームメンバー 余裕時間 \(今日 \/ 今週\) を開く'/.test(tcp)
  ) {
    findings.push({
      level: 'info',
      message: `team-capacity summary aria-label (open/close 両 state) 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `team-capacity summary aria-label 破壊`,
    })
  }

  // iter871 invariant: team-capacity 各 row 3 div の inner aria-hidden 維持
  if (
    /<span aria-hidden="true">\{name\}<\/span>/.test(tcp) &&
    /<span aria-hidden="true">\{formatMemberCapacityLoadJa\(today\)\}<\/span>/.test(tcp) &&
    /<span aria-hidden="true">\{formatMemberCapacityLoadJa\(week\)\}<\/span>/.test(tcp)
  ) {
    findings.push({
      level: 'info',
      message: `iter871 invariant: team-capacity row 3 div inner aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter871 invariant: 破壊` })
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

  console.log(`\n=== Findings (team-capacity-summary-aria-hidden-iter872) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
