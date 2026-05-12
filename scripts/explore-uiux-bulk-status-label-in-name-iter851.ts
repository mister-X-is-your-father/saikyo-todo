/**
 * Phase 6.15 loop iter 851 (mode-D Desktop a11y) —
 * bulk-action-bar status 変更 button: WCAG 2.5.3 (Label in Name) 違反を修正。
 *
 * 課題: src/components/workspace/bulk-action-bar.tsx の status 変更 button は
 *   visible text "{s.label} に" (例「todo に」) と aria-label "選択 N 件を「{s.label}」に変更"
 *   で voice command 用 prefix が一致しない。voice user が "{s.label} に" や
 *   "{s.label}" と発話しても accessible name 先頭が「選択 N 件を…」 で始まるため
 *   WCAG 2.5.3 (Label in Name) 違反。
 *
 * fix (1 ファイル ~3 行差分):
 *   - aria-label を「{s.label} に変更 (選択 N 件)」 形に変更し、visible "{s.label} に"
 *     を name 先頭に含める (label-in-name 適合 / iter850 destructive button 同パターン)。
 *   - 同時に visible "{s.label} に" を <span aria-hidden="true"> で wrap し、aria-label
 *     単独経路に統一 (iter844-850 と一貫)。
 *   - pending 時も "{s.label} に変更中…" prefix で name 統一。
 *
 * 検証: source-side regex assert + iter735/849/850 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const bab = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/bulk-action-bar.tsx'),
    'utf8',
  )

  // 1. status 変更 aria-label が visible "{s.label} に" prefix
  if (/aria-label=\{[\s\S]+?`\$\{s\.label\} に変更 \(選択 \$\{count\} 件\)`/.test(bab)) {
    findings.push({
      level: 'info',
      message: `bulk-status aria-label に visible "{s.label} に" prefix (WCAG 2.5.3 適合) OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `bulk-status aria-label が visible prefix を含まない`,
    })
  }

  // 2. pending 時 prefix
  if (/aria-label=\{[\s\S]+?`\$\{s\.label\} に変更中… \(選択 \$\{count\} 件\)`/.test(bab)) {
    findings.push({
      level: 'info',
      message: `bulk-status pending aria-label に visible "{s.label} に" prefix OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `bulk-status pending aria-label が visible prefix を含まない`,
    })
  }

  // 3. visible "{s.label} に" は span aria-hidden で wrap
  if (/<span aria-hidden="true">\{s\.label\} に<\/span>/.test(bab)) {
    findings.push({
      level: 'info',
      message: `bulk-status visible "{s.label} に" span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `bulk-status visible "{s.label} に" aria-hidden 未統合`,
    })
  }

  // 4. data-testid="bulk-status-${s.key}" + variant="outline" 維持
  if (/data-testid=\{`bulk-status-\$\{s\.key\}`\}/.test(bab) && /variant="outline"/.test(bab)) {
    findings.push({
      level: 'info',
      message: `bulk-status data-testid + variant 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `bulk-status attrs 破壊` })
  }

  // iter850 invariant: bulk-delete visible "削除" span aria-hidden 維持
  if (/<span aria-hidden="true">削除<\/span>/.test(bab)) {
    findings.push({
      level: 'info',
      message: `iter850 invariant: bulk-delete visible "削除" span aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter850 invariant: 破壊` })
  }

  // iter849 invariant: calendar-view 今日 button aria-hidden
  const cv = readFileSync(
    resolve(process.cwd(), 'src/components/schedule/calendar-view.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">今日<\/span>/.test(cv)) {
    findings.push({
      level: 'info',
      message: `iter849 invariant: calendar-view 今日 button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter849 invariant: 破壊` })
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

  console.log(`\n=== Findings (bulk-status-label-in-name-iter851) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
