/**
 * Phase 6.15 loop iter 903 (mode-D Desktop a11y) —
 * sprints-panel sprint-edit-start + sprint-edit-end input aria-label を WCAG 2.5.3
 * (Label in Name) 適合形に変更。
 *
 * 課題: src/components/workspace/sprints-panel.tsx の sprint-period 期間 inline editor
 *   の Sprint 開始日 / 終了日 input は visible <Label> "開始 ({dow})" / "終了 ({dow})"
 *   を持つが、旧 aria-label "Sprint 開始日 (現在: ${date} (${dow}))" などは "開始" と "(月)"
 *   の間に "日" などが挿入され、visible "開始 (月)" を substring に含まなかった
 *   → WCAG 2.5.3 違反 (3 case × 2 input = 6 状態すべて)。
 *
 * fix (1 ファイル / +6-6 行差分、2 input 一括):
 *   - sprint-edit-start aria-label: `開始 (${dow}): Sprint 開始日 ${date}` 形に変更し
 *     visible "開始 (${dow})" prefix 適合化
 *   - sprint-edit-end aria-label: `終了 (${dow}): Sprint 終了日 ${date}` 形に変更
 *
 * 検証: source-side regex assert + iter901/902 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )

  // 1. sprint-edit-start normal aria-label に "開始 (${dow})" prefix
  if (/`開始 \(\$\{dayOfWeekJa\(editStart\)\}\): Sprint 開始日 \$\{editStart\}`/.test(sp)) {
    findings.push({
      level: 'info',
      message: `sprint-edit-start normal aria-label に "開始 (${'${dow}'})" prefix 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-edit-start normal aria-label が "開始 (${'${dow}'})" prefix 不含`,
    })
  }

  // 2. sprint-edit-end normal aria-label に "終了 (${dow})" prefix
  if (/`終了 \(\$\{dayOfWeekJa\(editEnd\)\}\): Sprint 終了日 \$\{editEnd\}`/.test(sp)) {
    findings.push({
      level: 'info',
      message: `sprint-edit-end normal aria-label に "終了 (${'${dow}'})" prefix 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-edit-end normal aria-label が "終了 (${'${dow}'})" prefix 不含`,
    })
  }

  // 3. invalid 系 aria-label にも "開始 (${dow})" / "終了 (${dow})" prefix
  if (
    /`開始 \(\$\{dayOfWeekJa\(editStart\)\}\): Sprint 開始日 \$\{editStart\}、終了日 \$\{editEnd\} より後で不正`/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `sprint-edit-start invalid aria-label に "開始 (${'${dow}'})" prefix 含む OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `sprint-edit-start invalid aria-label 不含` })
  }
  if (
    /`終了 \(\$\{dayOfWeekJa\(editEnd\)\}\): Sprint 終了日 \$\{editEnd\}、開始日 \$\{editStart\} より前で不正`/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `sprint-edit-end invalid aria-label に "終了 (${'${dow}'})" prefix 含む OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `sprint-edit-end invalid aria-label 不含` })
  }

  // 4. 旧 aria-label "Sprint 開始日 (現在:" 削除
  if (!/`Sprint 開始日 \(現在: \$\{editStart\}/.test(sp)) {
    findings.push({
      level: 'info',
      message: `sprint-edit-start 旧 aria-label "Sprint 開始日 (現在:" 削除済 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `sprint-edit-start 旧 aria-label 残存` })
  }

  // iter902 invariant: edit-item-kr aria-label
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (/'Key Result \(OKR\) 割当を更新中…'/.test(ied)) {
    findings.push({
      level: 'info',
      message: `iter902 invariant: edit-item-kr aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter902 invariant: edit-item-kr 破壊` })
  }

  console.log(`\n=== Findings (sprint-period-input-label-in-name-iter903) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
