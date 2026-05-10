/**
 * Phase 6.15 loop iter 855 (mode-D Desktop a11y) —
 * item-edit-dialog ベースライン記録 / 更新 (set-baseline) button: WCAG 2.5.3
 * (Label in Name) 違反を修正 + visible text を span aria-hidden で wrap。
 *
 * 課題: src/components/workspace/item-edit-dialog.tsx の DialogFooter にある
 *   item-edit-set-baseline button は visible 3 状態 (記録中… / ベースライン更新 /
 *   ベースライン記録) に対し、aria-label が:
 *   - normal (no baseline): "「{title}」の startDate / dueDate を当初計画 (baseline) として保存"
 *     → visible "ベースライン記録" を全く含まない (ベースライン token 自体無し)
 *   - normal (with baseline): "「{title}」のベースラインを現在の startDate / dueDate に更新 (...)"
 *     → visible "ベースライン更新" は `ベースライン` と `更新` が非隣接で substring 不適合
 *   - pending: "「{title}」のベースラインを記録中…"
 *     → visible "記録中…" は substring ✓ だが visible "ベースライン記録中…" (新統一形)
 *       には "ベースラインを記録中…" 形が `を` 越しで substring 不適合
 *
 *   結果: 音声「ベースライン記録」「ベースライン更新」が button に hit せず WCAG 2.5.3 違反。
 *
 * fix (1 ファイル / +13-7 行差分):
 *   - aria-label normal (no baseline): `「${title}」ベースライン記録 (現在の startDate / dueDate を当初計画として保存)`
 *   - aria-label normal (with baseline): `「${title}」ベースライン更新 (現在の startDate / dueDate に上書き、旧 baseline: ${start} → ${end})`
 *   - aria-label pending: `「${title}」ベースライン記録中… (startDate / dueDate を当初計画として保存)`
 *   - visible pending: '記録中…' → 'ベースライン記録中…' (visible / aria-label 統一)
 *   - visible 全体を <span aria-hidden="true"> で wrap、aria-label 単独経路。
 *
 * 検証: source-side regex assert + iter849-854 invariant cross-check。
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

  // 1. normal (no baseline) aria-label に visible "ベースライン記録" prefix
  if (
    /`「\$\{item\.title\}」ベースライン記録 \(現在の startDate \/ dueDate を当初計画として保存\)`/.test(
      ied,
    )
  ) {
    findings.push({
      level: 'info',
      message: `set-baseline normal (no baseline) aria-label に "ベースライン記録" prefix 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `set-baseline normal (no baseline) aria-label が "ベースライン記録" を prefix に含まない`,
    })
  }

  // 2. normal (with baseline) aria-label に visible "ベースライン更新" prefix
  if (
    /`「\$\{item\.title\}」ベースライン更新 \(現在の startDate \/ dueDate に上書き、旧 baseline: \$\{item\.baselineStartDate\} → \$\{item\.baselineEndDate\}\)`/.test(
      ied,
    )
  ) {
    findings.push({
      level: 'info',
      message: `set-baseline normal (with baseline) aria-label に "ベースライン更新" prefix 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `set-baseline normal (with baseline) aria-label が "ベースライン更新" を prefix に含まない`,
    })
  }

  // 3. pending aria-label に visible "ベースライン記録中…" prefix
  if (
    /`「\$\{item\.title\}」ベースライン記録中… \(startDate \/ dueDate を当初計画として保存\)`/.test(
      ied,
    )
  ) {
    findings.push({
      level: 'info',
      message: `set-baseline pending aria-label に "ベースライン記録中…" prefix 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `set-baseline pending aria-label が "ベースライン記録中…" を prefix に含まない`,
    })
  }

  // 4. visible 3 状態は span aria-hidden で wrap + visible "記録中…" → "ベースライン記録中…" 統一
  if (
    /<span aria-hidden="true">\s*\{setBaseline\.isPending\s*\?\s*'ベースライン記録中…'\s*:\s*item\.baselineStartDate\s*\?\s*'ベースライン更新'\s*:\s*'ベースライン記録'\}\s*<\/span>/.test(
      ied,
    )
  ) {
    findings.push({
      level: 'info',
      message: `set-baseline visible 3 状態 span aria-hidden 統合 + visible/aria-label 統一 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `set-baseline visible 3 状態 aria-hidden 未統合 or visible "ベースライン記録中…" 未統一`,
    })
  }

  // 5. 旧 aria-label "ベースラインを記録中" が消えている (regression guard)
  if (!/「\$\{item\.title\}」のベースラインを記録中…/.test(ied)) {
    findings.push({
      level: 'info',
      message: `set-baseline 旧 aria-label "ベースラインを記録中" pattern 削除済 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `set-baseline 旧 aria-label "ベースラインを記録中" pattern が残存`,
    })
  }

  // 6. 旧 visible "記録中…" 単独形が消えている
  if (!/'記録中…'\s*:\s*item\.baselineStartDate/.test(ied)) {
    findings.push({
      level: 'info',
      message: `set-baseline 旧 visible "記録中…" 単独形削除済 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `set-baseline 旧 visible "記録中…" 単独形残存`,
    })
  }

  // 7. data-testid="item-edit-set-baseline" 維持
  if (/data-testid="item-edit-set-baseline"/.test(ied)) {
    findings.push({
      level: 'info',
      message: `set-baseline data-testid 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `set-baseline data-testid 破壊` })
  }

  // iter854 invariant: unarchive normal aria-label "アーカイブ復元" prefix
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

  // iter852 invariant: bulk-clear visible "解除" aria-hidden
  const bab = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/bulk-action-bar.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">解除<\/span>/.test(bab)) {
    findings.push({
      level: 'info',
      message: `iter852 invariant: bulk-clear "解除" aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter852 invariant: bulk-clear 破壊` })
  }

  console.log(`\n=== Findings (item-edit-set-baseline-label-in-name-iter855) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
