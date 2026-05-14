/**
 * Phase 6.15 loop iter 851 (mode-D Desktop a11y) —
 * bulk-action-bar status 変更 button: WCAG 2.5.3 (Label in Name) 違反を修正。
 *
 * 課題: src/components/workspace/bulk-action-bar.tsx の status 変更 button (workspace_status ごとに展開) は
 *   visible "${s.label} に" (例: "完了 に") に対し、aria-label が
 *   - 通常時: "選択 N 件を「${s.label}」に変更"  ← visible "${s.label} に" を substring に含まない (「」が間に入る)
 *   - pending: "選択 N 件のステータスを変更中…"  ← visible "${s.label}" すら含まない
 *   いずれも WCAG 2.5.3 (Label in Name) 失敗。音声コマンド「click 完了 に」が name に
 *   一致せず button を起動できない。さらに visible は aria-hidden 無しで aria-label との
 *   重複読み上げ。
 *
 * fix (1 ファイル ~4 行差分):
 *   - aria-label を「${s.label} に変更: 選択 N 件のステータスを更新」/「${s.label} に変更中… (選択 N 件)」 形に
 *     refactor し、visible "${s.label} に" を name の先頭 (prefix) に含める。
 *   - 同時に visible "${s.label} に" を <span aria-hidden="true"> で wrap し、aria-label
 *     単独経路に統一 (iter844-850 と同 pattern)。
 *   - 「変更: 〜 を更新」 / 「変更中…」 で動詞を補い、SR ユーザに button 機能 (= status 一括変更)
 *     を明示。
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

  // 1. idle aria-label: visible "${s.label} に" が prefix に含まれる (label-in-name 適合)
  if (
    /aria-label=\{[\s\S]+?`\$\{s\.label\} に変更: 選択 \$\{count\} 件のステータスを更新`/.test(
      bab,
    )
  ) {
    findings.push({
      level: 'info',
      message: `bulk-status idle aria-label に visible "\${s.label} に" prefix 含む (WCAG 2.5.3 適合) OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `bulk-status idle aria-label が visible "\${s.label} に" を prefix に含まない`,
    })
  }

  // 2. pending aria-label: visible "${s.label} に" が prefix に含まれる
  if (
    /aria-label=\{[\s\S]+?`\$\{s\.label\} に変更中… \(選択 \$\{count\} 件\)`/.test(bab)
  ) {
    findings.push({
      level: 'info',
      message: `bulk-status pending aria-label に visible "\${s.label} に" prefix 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `bulk-status pending aria-label が visible "\${s.label} に" を prefix に含まない`,
    })
  }

  // 3. visible "${s.label} に" は span aria-hidden で wrap
  if (/<span aria-hidden="true">\{s\.label\} に<\/span>/.test(bab)) {
    findings.push({
      level: 'info',
      message: `bulk-status visible "\${s.label} に" span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `bulk-status visible "\${s.label} に" aria-hidden 未統合`,
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

  // iter850 invariant: bulk-delete aria-label に削除 prefix + visible 削除 aria-hidden
  if (
    /aria-label=\{[\s\S]+?`選択 \$\{count\} 件を削除 \(soft delete: ゴミ箱で 30 日保持\)`/.test(
      bab,
    ) &&
    /<span aria-hidden="true">削除<\/span>/.test(bab)
  ) {
    findings.push({
      level: 'info',
      message: `iter850 invariant: bulk-delete aria-label prefix + aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter850 invariant: 破壊` })
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
