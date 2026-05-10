/**
 * Phase 6.15 loop iter 866 (mode-D Desktop a11y) —
 * goals-panel goal-reactivate button (completed / archived status 両方): WCAG 2.5.3
 * (Label in Name) 違反を pending 状態で修正 + visible "active に戻す" を span
 * aria-hidden で wrap (campaign 拡張)。
 *
 * 課題: src/components/workspace/goals-panel.tsx の goal-reactivate button は
 *   completed / archived 両 status から呼べるが pending 中 aria-label "Goal「{title}」
 *   のステータスを更新中…" は visible "active に戻す" を含まず、4 transition button
 *   共通の曖昧 label。Goal を再開すると KR (Key Result) を再度更新可能になる
 *   mental model も aria-label に欠落していた。
 *
 * fix (1 ファイル / +6-2 行差分、completed branch + archived branch 計 2 occurrences):
 *   - aria-label pending: `Goal「${title}」を active に戻す処理中… (現状態 → active 遷移)`
 *   - aria-label normal: `Goal「${title}」を active に戻す (現状態 → active 遷移、再開して KR を更新可能に)`
 *   - visible "active に戻す" を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter858-865 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )

  // 1. pending aria-label に visible "active に戻す" prefix (2 箇所)
  const pendingMatches = gp.match(
    /`Goal「\$\{goal\.title\}」を active に戻す処理中… \(現状態 → active 遷移\)`/g,
  )
  if (pendingMatches && pendingMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `goal-reactivate pending aria-label に "active に戻す" prefix 含む (${pendingMatches.length} 箇所) OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `goal-reactivate pending aria-label に visible prefix 不足 (2 箇所必要)`,
    })
  }

  // 2. normal aria-label に「KR 更新可能に」 hint (2 箇所)
  const normalMatches = gp.match(
    /`Goal「\$\{goal\.title\}」を active に戻す \(現状態 → active 遷移、再開して KR を更新可能に\)`/g,
  )
  if (normalMatches && normalMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `goal-reactivate normal aria-label に KR 更新可能 hint 含む (${normalMatches.length} 箇所) OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `goal-reactivate normal aria-label に KR hint 不足 (2 箇所必要)`,
    })
  }

  // 3. visible "active に戻す" span aria-hidden (2 箇所)
  const wrapMatches = gp.match(/<span aria-hidden="true">active に戻す<\/span>/g)
  if (wrapMatches && wrapMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `goal-reactivate visible "active に戻す" aria-hidden (${wrapMatches.length} 箇所) 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `goal-reactivate visible "active に戻す" aria-hidden 未統合 (2 箇所必要)`,
    })
  }

  // 4. 旧 aria-label "ステータスを更新中…" pattern (goal-reactivate context) が消える
  // archive context にはまだ残るので全消ではない、reactivate 周辺で消えていることだけ確認
  const reactivateRegions = gp.match(/data-testid=\{`goal-reactivate[\s\S]{0,400}/g) ?? []
  const stillHasOld = reactivateRegions.some((r) =>
    /Goal「\$\{goal\.title\}」のステータスを更新中…/.test(r),
  )
  if (!stillHasOld) {
    findings.push({
      level: 'info',
      message: `goal-reactivate 旧 aria-label "ステータスを更新中" pattern (近傍) 削除済 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `goal-reactivate 旧 aria-label pattern 残存`,
    })
  }

  // iter865 invariant: goal-archive aria-label
  if (
    /`Goal「\$\{goal\.title\}」をアーカイブ \(現状態 → archived 遷移、後で active 復帰可\)`/.test(
      gp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter865 invariant: goal-archive aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter865 invariant: goal-archive 破壊` })
  }

  // iter864 invariant: goal-complete
  if (/`Goal「\$\{goal\.title\}」を完了 \(active → completed へ遷移\)`/.test(gp)) {
    findings.push({
      level: 'info',
      message: `iter864 invariant: goal-complete aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter864 invariant: goal-complete 破壊` })
  }

  console.log(`\n=== Findings (goal-reactivate-label-in-name-iter866) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
