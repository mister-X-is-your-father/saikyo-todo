/**
 * Phase 6.15 loop iter 850 (mode-D Desktop a11y) —
 * bulk-action-bar 削除 button: WCAG 2.5.3 (Label in Name) 違反を修正。
 *
 * 課題: src/components/workspace/bulk-action-bar.tsx の destructive button は
 *   visible text "削除" (日本語) と aria-label "選択 N 件を soft delete" (英語) で
 *   vocabulary が不一致。SR ユーザの音声コマンド (「削除」 button をクリック) と
 *   sighted ユーザが見る label が乖離 → WCAG 2.5.3 (Label in Name) 失敗。
 *   さらに visible "削除" は aria-label に含まれないため `name` に visible text が
 *   含まれない (label-in-name 直接違反)。
 *
 * fix (1 ファイル ~3 行差分):
 *   - aria-label を「選択 N 件を削除 (soft delete: ゴミ箱で 30 日保持)」 形に変更し、
 *     visible "削除" を aria-label の prefix 部 (= name の先頭) に含める。
 *   - 同時に visible "削除" を <span aria-hidden="true"> で wrap し、aria-label
 *     単独経路に統一 (auth/workspace/quick-add 等 iter844-848 と同 pattern)。
 *   - 副次効果として 「30 日保持」 hint で「物理削除ではない」 mental model を
 *     SR / sighted 双方に伝える。
 *
 * 検証: source-side regex assert + iter735-849 invariant cross-check。
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

  // 1. visible 削除 が aria-label prefix に含まれる (label-in-name 適合)
  if (
    /aria-label=\{[\s\S]+?`選択 \$\{count\} 件を削除 \(soft delete: ゴミ箱で 30 日保持\)`/.test(bab)
  ) {
    findings.push({
      level: 'info',
      message: `bulk-delete aria-label に visible 削除 prefix 含む (WCAG 2.5.3 適合) OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `bulk-delete aria-label が visible 削除 を prefix に含まない`,
    })
  }

  // 2. pending 状態も削除 prefix
  if (
    /aria-label=\{[\s\S]+?`選択 \$\{count\} 件を削除中… \(soft delete: ゴミ箱で 30 日保持\)`/.test(
      bab,
    )
  ) {
    findings.push({
      level: 'info',
      message: `bulk-delete pending aria-label に visible 削除 prefix 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `bulk-delete pending aria-label が visible 削除 を prefix に含まない`,
    })
  }

  // 3. visible "削除" は span aria-hidden で wrap
  if (/<span aria-hidden="true">削除<\/span>/.test(bab)) {
    findings.push({
      level: 'info',
      message: `bulk-delete visible "削除" span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `bulk-delete visible "削除" aria-hidden 未統合`,
    })
  }

  // 4. data-testid="bulk-delete" + variant="destructive" 維持
  if (/data-testid="bulk-delete"/.test(bab) && /variant="destructive"/.test(bab)) {
    findings.push({
      level: 'info',
      message: `bulk-delete data-testid + variant 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `bulk-delete attrs 破壊` })
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

  console.log(`\n=== Findings (bulk-delete-label-in-name-iter850) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
