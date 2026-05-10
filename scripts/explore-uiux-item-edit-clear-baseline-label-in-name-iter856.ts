/**
 * Phase 6.15 loop iter 856 (mode-D Desktop a11y) —
 * item-edit-dialog ベースラインクリア (clear-baseline) button: WCAG 2.5.3
 * (Label in Name) 違反 + Latin/Katakana script mismatch を修正 +
 * visible text を span aria-hidden で wrap (campaign 統一)。
 *
 * 課題: src/components/workspace/item-edit-dialog.tsx の DialogFooter にある
 *   item-edit-clear-baseline button は visible "baseline クリア" / "クリア中…" に対し、
 *   旧 aria-label "「{title}」のベースライン (...) をクリア" / "「{title}」のベースラインを
 *   クリア中…" だったため:
 *   - visible "baseline" (Latin) vs aria-label "ベースライン" (Katakana) で script
 *     完全 mismatch → substring 不適合 (WCAG 2.5.3 違反)
 *   - visible "クリア中…" は短縮形で何が clear 中か曖昧 (SR 体験を阻害)
 *
 *   結果: 音声「ベースラインクリア」「baseline クリア」どちらでも button hit せず
 *   WCAG 2.5.3 違反、Latin/Katakana 混在で i18n 一貫性も損失。
 *
 * fix (1 ファイル / +5-3 行差分):
 *   - aria-label normal: `「${title}」ベースラインクリア (現在 ${start} → ${end} を NULL に戻す)`
 *   - aria-label pending: `「${title}」ベースラインクリア中… (baseline 列を NULL に戻す)`
 *   - visible non-pending: 'baseline クリア' (Latin) → 'ベースラインクリア' (Katakana 統一)
 *   - visible pending: 'クリア中…' → 'ベースラインクリア中…' (visible / aria-label 統一)
 *   - visible 全体を <span aria-hidden="true"> で wrap、aria-label 単独経路。
 *   - title="baseline 列を NULL に戻す" は維持 (DBA 用 hint で Latin が適切)
 *
 * 検証: source-side regex assert + iter849-855 invariant cross-check。
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

  // 1. normal aria-label に visible "ベースラインクリア" prefix
  if (
    /`「\$\{item\.title\}」ベースラインクリア \(現在 \$\{item\.baselineStartDate\} → \$\{item\.baselineEndDate\} を NULL に戻す\)`/.test(
      ied,
    )
  ) {
    findings.push({
      level: 'info',
      message: `clear-baseline normal aria-label に "ベースラインクリア" prefix 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `clear-baseline normal aria-label が "ベースラインクリア" を prefix に含まない`,
    })
  }

  // 2. pending aria-label に visible "ベースラインクリア中…" prefix
  if (/`「\$\{item\.title\}」ベースラインクリア中… \(baseline 列を NULL に戻す\)`/.test(ied)) {
    findings.push({
      level: 'info',
      message: `clear-baseline pending aria-label に "ベースラインクリア中…" prefix 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `clear-baseline pending aria-label が "ベースラインクリア中…" を prefix に含まない`,
    })
  }

  // 3. visible 'ベースラインクリア中…' / 'ベースラインクリア' は span aria-hidden で wrap (Katakana 統一)
  if (
    /<span aria-hidden="true">\s*\{clearBaseline\.isPending \? 'ベースラインクリア中…' : 'ベースラインクリア'\}\s*<\/span>/.test(
      ied,
    )
  ) {
    findings.push({
      level: 'info',
      message: `clear-baseline visible 2 状態 span aria-hidden + Katakana 統一 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `clear-baseline visible 2 状態 aria-hidden 未統合 or Katakana 未統一`,
    })
  }

  // 4. 旧 visible "baseline クリア" (Latin) が消えている
  if (!/'baseline クリア'/.test(ied)) {
    findings.push({
      level: 'info',
      message: `clear-baseline 旧 visible "baseline クリア" (Latin) 削除済 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `clear-baseline 旧 visible "baseline クリア" (Latin) が残存`,
    })
  }

  // 5. 旧 aria-label "ベースラインをクリア中" pattern 消滅
  if (!/「\$\{item\.title\}」のベースラインをクリア中…/.test(ied)) {
    findings.push({
      level: 'info',
      message: `clear-baseline 旧 aria-label "ベースラインをクリア中" pattern 削除済 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `clear-baseline 旧 aria-label "ベースラインをクリア中" pattern が残存`,
    })
  }

  // 6. title="baseline 列を NULL に戻す" 維持 (DBA 向け hint、Latin OK)
  if (/title="baseline 列を NULL に戻す"/.test(ied)) {
    findings.push({
      level: 'info',
      message: `clear-baseline title (DBA hint) 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `clear-baseline title が削除/変更された`,
    })
  }

  // 7. data-testid="item-edit-clear-baseline" 維持
  if (/data-testid="item-edit-clear-baseline"/.test(ied)) {
    findings.push({
      level: 'info',
      message: `clear-baseline data-testid 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `clear-baseline data-testid 破壊` })
  }

  // iter855 invariant: set-baseline normal (no baseline) aria-label
  if (
    /`「\$\{item\.title\}」ベースライン記録 \(現在の startDate \/ dueDate を当初計画として保存\)`/.test(
      ied,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter855 invariant: set-baseline aria-label "ベースライン記録" prefix 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter855 invariant: set-baseline 破壊` })
  }

  // iter854 invariant: unarchive aria-label "アーカイブ復元" prefix
  if (/`「\$\{item\.title\}」アーカイブ復元 \(アーカイブから戻して再び編集可能に\)`/.test(ied)) {
    findings.push({
      level: 'info',
      message: `iter854 invariant: unarchive aria-label "アーカイブ復元" prefix 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter854 invariant: unarchive 破壊` })
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

  console.log(`\n=== Findings (item-edit-clear-baseline-label-in-name-iter856) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
