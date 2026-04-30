/**
 * Phase 6.15 loop iter 489 (mode-D Desktop a11y) —
 * ScheduleItemPicker の空状態 + ul list に role="status" + aria-label + data-testid 追加、codify。
 *
 * 課題: src/components/schedule/schedule-item-picker.tsx 行 57-77:
 *   1. 空状態 `<div className="text-muted-foreground py-6 text-center text-sm">該当する task が見つかりません</div>`
 *      が plain div で `role="status"` / `aria-live` 漏れ → 検索 input で q を変えて結果が
 *      0 件になっても SR は「該当 task なし」を announce しない (= filter UX で重要な
 *      live update が SR ユーザに届かない)
 *   2. `<ul className="flex flex-col gap-1">` に aria-label 不在 → ul の context が
 *      検索結果リストであることが SR に伝わらない (parent dialog labelledby は
 *      "task を選択" の機能 label のみ、結果件数 dynamic は ul に必要)
 *   3. data-testid 不在 → Playwright runtime test で空状態 / list を identify 不可
 *
 *   iter419 (dialog labelledby + Escape + 検索 input aria-label) / iter480 (MUST badge 統一)
 *   に続く ScheduleItemPicker a11y 補強の 3 件目。
 *
 * fix (1 ファイル ~7 行差分):
 *   - 空状態 div に `role="status"` + `aria-live="polite"` + `data-testid="schedule-picker-empty"` 追加
 *   - ul に `aria-label={`検索結果 ${filtered.length} 件`}` + `data-testid="schedule-picker-list"` 追加
 *   - 機能不変、視覚 layout 不変、shadcn 編集なし
 *
 * 検証: source-side regex assert + iter419 / iter480 invariant 維持 cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const path = 'src/components/schedule/schedule-item-picker.tsx'
  const src = readFileSync(resolve(process.cwd(), path), 'utf8')

  // 1. 空状態 div に role="status" + aria-live="polite" + data-testid 配線
  if (
    /<div[\s\S]{0,200}?role="status"[\s\S]{0,200}?aria-live="polite"[\s\S]{0,200}?data-testid="schedule-picker-empty"[\s\S]{0,200}?>\s*\n?\s*該当する task が見つかりません/.test(
      src,
    )
  ) {
    findings.push({
      level: 'info',
      message: `${path}: 空状態 div role=status + aria-live + data-testid OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: 空状態 div role=status + aria-live + data-testid 不在`,
    })
  }

  // 2. ul に aria-label + data-testid 配線
  if (
    /<ul[\s\S]{0,200}?aria-label=\{`検索結果 \$\{filtered\.length\} 件`\}[\s\S]{0,200}?data-testid="schedule-picker-list"/.test(
      src,
    )
  ) {
    findings.push({ level: 'info', message: `${path}: ul aria-label + data-testid OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: ul aria-label + data-testid 不在` })
  }

  // 3. iter419 invariant: dialog labelledby + Escape + 検索 input aria-label
  if (
    /role="dialog"[\s\S]{0,200}?aria-labelledby="schedule-picker-title"/.test(src) &&
    /e\.key === 'Escape'[\s\S]{0,100}?onCancel\(\)/.test(src) &&
    /aria-label="task を検索"/.test(src)
  ) {
    findings.push({
      level: 'info',
      message: `${path}: iter419 invariant (dialog + escape + 検索 input) 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `${path}: iter419 invariant 破壊` })
  }

  // 4. iter480 invariant: MustBadge import + 配線
  if (
    /import\s+\{\s*MustBadge\s*\}\s+from\s+'@\/components\/workspace\/must-badge'/.test(src) &&
    /it\.isMust\s*\?\s*<MustBadge\s+data-testid=\{`schedule-picker-must-\$\{it\.id\}`\}\s*\/>/.test(
      src,
    )
  ) {
    findings.push({ level: 'info', message: `${path}: iter480 invariant (MustBadge) 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: iter480 invariant 破壊` })
  }

  // 5. 旧 plain 空状態 div が消えている (role=status 化済)
  if (
    !/<div className="text-muted-foreground py-6 text-center text-sm">\s*\n?\s*該当する task が見つかりません/.test(
      src,
    )
  ) {
    findings.push({ level: 'info', message: `${path}: 旧 plain 空状態 div が消えている OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: 旧 plain 空状態 div が残存` })
  }

  // 6. 旧 plain ul が消えている (aria-label 化済)
  if (!/<ul className="flex flex-col gap-1">/.test(src)) {
    findings.push({ level: 'info', message: `${path}: 旧 plain ul が消えている OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: 旧 plain ul が残存` })
  }

  console.log(`\n=== Findings (schedule-picker-empty-list-iter489) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
