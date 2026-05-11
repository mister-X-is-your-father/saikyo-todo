/**
 * Phase 6.15 loop iter 851 (mode-D Desktop a11y) —
 * bulk-action-bar status 変更 button: WCAG 2.5.3 (Label in Name) 違反を修正。
 *
 * 課題: src/components/workspace/bulk-action-bar.tsx の status 切替 button (1
 *   Button × .map() で workspace_statuses 件分 生成) は visible text
 *   "{s.label} に" (例: "Done に") を持つが aria-label は
 *   "選択 N 件を「{s.label}」に変更" 形 — visible text "Done に" は鍵括弧
 *   "「」" + "変更" suffix のため aria-label の strict substring に **ならない**
 *   (= name に visible text 含まれず WCAG 2.5.3 失敗)。
 *   さらに pending 中の aria-label "選択 N 件のステータスを変更中…" は visible
 *   "{s.label} に" / aria-label の static 形 と vocabulary 不整合 (status label
 *   が消える)。
 *
 * fix (1 ファイル ~3 行差分):
 *   - visible "{s.label} に" を <span aria-hidden="true"> で wrap、aria-label
 *     単独経路に統一 (auth/workspace/quick-add/calendar/item-edit-tabs/bulk-delete
 *     iter844-850 同 pattern)。
 *   - pending 時 aria-label を「選択 N 件を「{s.label}」に変更中…」 形に揃え、
 *     status label が pending でも消えないようにする。
 *
 * 検証: source-side regex assert + iter735-850 invariant cross-check。
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

  // 1. visible "{s.label} に" は span aria-hidden で wrap
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

  // 2. 通常時 aria-label が status label を含む
  if (/`選択 \$\{count\} 件を「\$\{s\.label\}」に変更`/.test(bab)) {
    findings.push({
      level: 'info',
      message: `bulk-status idle aria-label に status label 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `bulk-status idle aria-label が status label を含まない`,
    })
  }

  // 3. pending 時 aria-label も status label を含む (iter851 fix)
  if (/`選択 \$\{count\} 件を「\$\{s\.label\}」に変更中…`/.test(bab)) {
    findings.push({
      level: 'info',
      message: `bulk-status pending aria-label に status label 含む OK (iter851 fix)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `bulk-status pending aria-label が status label を含まない`,
    })
  }

  // 4. data-testid="bulk-status-{key}" 維持
  if (/data-testid=\{`bulk-status-\$\{s\.key\}`\}/.test(bab)) {
    findings.push({
      level: 'info',
      message: `bulk-status data-testid 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `bulk-status data-testid 破壊` })
  }

  // iter850 alt invariant: bulk-delete aria-label に visible 削除 prefix
  if (
    /aria-label=\{[\s\S]+?`選択 \$\{count\} 件を削除 \(soft delete: ゴミ箱で 30 日保持\)`/.test(bab)
  ) {
    findings.push({
      level: 'info',
      message: `iter850 alt invariant: bulk-delete aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter850 alt invariant: 破壊` })
  }
  if (/<span aria-hidden="true">削除<\/span>/.test(bab)) {
    findings.push({
      level: 'info',
      message: `iter850 alt invariant: bulk-delete visible "削除" aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter850 alt invariant: 破壊` })
  }

  // iter849 invariant: calendar-view today reset button aria-hidden
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

  console.log(`\n=== Findings (bulk-status-aria-hidden-iter851) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
