/**
 * Phase 6.15 loop iter 854 (mode-D Desktop a11y) —
 * item-edit-dialog アーカイブ復元 (unarchive) button: WCAG 2.5.3 (Label in Name)
 * 違反を修正 + visible text を span aria-hidden で wrap (campaign 統一)。
 *
 * 課題: src/components/workspace/item-edit-dialog.tsx の DialogFooter にある
 *   item-edit-unarchive button は visible "アーカイブ復元" / "復元中…" に対し、
 *   旧 aria-label は "「{title}」をアーカイブから復元" / "...から復元中…" だったため、
 *   visible token "アーカイブ復元" (no から) が aria-label "アーカイブから復元" の
 *   substring に含まれていなかった (`から` が間に入っていた)。pending 中は visible
 *   "復元中…" は aria-label "...から復元中…" に含まれるため適合だったが、normal は
 *   完全乖離 → WCAG 2.5.3 違反。
 *
 *   結果: 音声コマンド「アーカイブ復元」と発声しても button が hit せず、視覚で
 *   「アーカイブ復元」を読みながら「アーカイブから復元」と発声し直す UX 摩擦。
 *
 * fix (1 ファイル / +5-3 行差分):
 *   - aria-label normal: `「${title}」アーカイブ復元 (アーカイブから戻して再び編集可能に)`
 *   - aria-label pending: `「${title}」アーカイブ復元中… (アーカイブから戻す)`
 *   - visible non-pending: 'アーカイブ復元' (維持)
 *   - visible pending: '復元中…' → 'アーカイブ復元中…' (visible / aria-label を統一)
 *   - visible 全体を <span aria-hidden="true"> で wrap、aria-label 単独経路。
 *
 * 検証: source-side regex assert + iter849-853 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )

  // 1. normal 状態の aria-label に visible "アーカイブ復元" prefix
  if (/`「\$\{item\.title\}」アーカイブ復元 \(アーカイブから戻して再び編集可能に\)`/.test(ied)) {
    findings.push({
      level: 'info',
      message: `unarchive normal aria-label に visible "アーカイブ復元" prefix 含む (WCAG 2.5.3 適合) OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `unarchive normal aria-label が visible "アーカイブ復元" を prefix に含まない`,
    })
  }

  // 2. pending 状態も同 prefix
  if (/`「\$\{item\.title\}」アーカイブ復元中… \(アーカイブから戻す\)`/.test(ied)) {
    findings.push({
      level: 'info',
      message: `unarchive pending aria-label に visible "アーカイブ復元中…" prefix 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `unarchive pending aria-label が visible "アーカイブ復元中…" を prefix に含まない`,
    })
  }

  // 3. visible 'アーカイブ復元中…' / 'アーカイブ復元' は span aria-hidden で wrap
  if (
    /<span aria-hidden="true">\s*\{unarchive\.isPending \? 'アーカイブ復元中…' : 'アーカイブ復元'\}\s*<\/span>/.test(
      ied,
    )
  ) {
    findings.push({
      level: 'info',
      message: `unarchive visible text span aria-hidden 統合 + visible/aria-label 統一 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `unarchive visible text aria-hidden 未統合 or visible "アーカイブ復元中…" 未統一`,
    })
  }

  // 4. 旧 aria-label "アーカイブから復元" pattern が消えている (regression guard)
  if (!/「\$\{item\.title\}」をアーカイブから復元/.test(ied)) {
    findings.push({
      level: 'info',
      message: `unarchive 旧 aria-label "アーカイブから復元" pattern 削除済 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `unarchive 旧 aria-label "アーカイブから復元" pattern が残存`,
    })
  }

  // 5. 旧 visible "復元中…" (短縮形) が消えている
  if (!/'復元中…' : 'アーカイブ復元'/.test(ied)) {
    findings.push({
      level: 'info',
      message: `unarchive 旧 visible "復元中…" 短縮形削除済 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `unarchive 旧 visible "復元中…" 短縮形残存`,
    })
  }

  // 6. data-testid="item-edit-unarchive" 維持
  if (/data-testid="item-edit-unarchive"/.test(ied)) {
    findings.push({
      level: 'info',
      message: `unarchive data-testid 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `unarchive data-testid 破壊` })
  }

  // iter853 invariant: archive button visible aria-hidden
  if (
    /<span aria-hidden="true">\s*\{archive\.isPending \? 'アーカイブ中…' : 'アーカイブ'\}\s*<\/span>/.test(
      ied,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter853 invariant: archive button visible aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter853 invariant: archive 破壊` })
  }

  // iter852 invariant: bulk-clear visible "解除" span aria-hidden
  const bab = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/bulk-action-bar.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">解除<\/span>/.test(bab)) {
    findings.push({
      level: 'info',
      message: `iter852 invariant: bulk-clear visible "解除" aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter852 invariant: bulk-clear 破壊` })
  }

  // iter851 invariant: bulk-status visible "{s.label} に" span aria-hidden
  if (/<span aria-hidden="true">\{s\.label\} に<\/span>/.test(bab)) {
    findings.push({
      level: 'info',
      message: `iter851 invariant: bulk-status visible aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter851 invariant: bulk-status 破壊` })
  }

  console.log(`\n=== Findings (item-edit-unarchive-label-in-name-iter854) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
