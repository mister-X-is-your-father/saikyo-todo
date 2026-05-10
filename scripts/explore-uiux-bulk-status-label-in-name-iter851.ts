/**
 * Phase 6.15 loop iter 851 (mode-D Desktop a11y) —
 * bulk-action-bar 一括 status 変更 button: WCAG 2.5.3 (Label in Name) 違反を修正。
 *
 * 課題: src/components/workspace/bulk-action-bar.tsx のステータス変更 button は
 *   visible text "{s.label} に" (例: "Doing に") に対し、旧 aria-label が
 *   "選択 N 件を「{s.label}」に変更" だったため、visible token "{s.label} に"
 *   (空白文字含む) が aria-label の substring に含まれていなかった (`「`/`」`
 *   が間に入っていた)。pending 状態では aria-label が "選択 N 件のステータスを
 *   変更中…" で {s.label} を全く含まず、visible label と完全乖離。
 *
 *   結果: 音声コマンド「Doing に」「Done に」と発声しても button が hit せず、
 *   WCAG 2.5.3 (Label in Name) 違反。
 *
 * fix (1 ファイル ~3 行差分):
 *   - aria-label を `${s.label} に変更 (選択 N 件のステータス一括更新)` 形に変更し、
 *     visible token "{s.label} に" を accessible name の prefix に含める。
 *   - pending 状態も `${s.label} に変更中… (選択 N 件のステータス一括更新)` で
 *     {s.label} と "に" を維持し、変更先の status が SR / 音声に伝わるように。
 *   - 同時に visible "{s.label} に" を <span aria-hidden="true"> で wrap し、
 *     aria-label 単独経路に統一 (iter850 alt の bulk-delete と同 pattern)。
 *
 * 検証: source-side regex assert + iter844-850 invariant cross-check。
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

  // 1. normal 状態の aria-label に "${s.label} に変更" を含む (label-in-name 適合)
  if (/`\$\{s\.label\} に変更 \(選択 \$\{count\} 件のステータス一括更新\)`/.test(bab)) {
    findings.push({
      level: 'info',
      message: `bulk-status normal aria-label に "${'${s.label} に'}" prefix 含む (WCAG 2.5.3 適合) OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `bulk-status normal aria-label が visible "{s.label} に" を prefix に含まない`,
    })
  }

  // 2. pending 状態も同 prefix
  if (/`\$\{s\.label\} に変更中… \(選択 \$\{count\} 件のステータス一括更新\)`/.test(bab)) {
    findings.push({
      level: 'info',
      message: `bulk-status pending aria-label に "${'${s.label} に'}" prefix 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `bulk-status pending aria-label が visible "{s.label} に" を prefix に含まない`,
    })
  }

  // 3. visible "{s.label} に" は span aria-hidden で wrap (campaign style)
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

  // 4. 旧 "選択 N 件のステータスを変更中…" pattern が消えている
  if (!/`選択 \$\{count\} 件のステータスを変更中…`/.test(bab)) {
    findings.push({
      level: 'info',
      message: `bulk-status 旧 pending aria-label pattern 削除済 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `bulk-status 旧 pending aria-label pattern が残存`,
    })
  }

  // 5. data-testid="bulk-status-${s.key}" 維持
  if (/data-testid=\{`bulk-status-\$\{s\.key\}`\}/.test(bab)) {
    findings.push({
      level: 'info',
      message: `bulk-status data-testid 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `bulk-status data-testid 破壊` })
  }

  // iter850 invariant: bulk-delete aria-label に visible 削除 prefix
  if (/`選択 \$\{count\} 件を削除 \(soft delete: ゴミ箱で 30 日保持\)`/.test(bab)) {
    findings.push({
      level: 'info',
      message: `iter850 invariant: bulk-delete aria-label visible 削除 prefix 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter850 invariant: bulk-delete 破壊` })
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
    findings.push({ level: 'warning', message: `iter849 invariant: calendar 破壊` })
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
    findings.push({ level: 'warning', message: `iter735 invariant: team-context 破壊` })
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
