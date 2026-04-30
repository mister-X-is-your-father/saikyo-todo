/**
 * Phase 6.15 loop iter 430 (mode-D Desktop a11y) — Calendar view の左/右
 * 2 lane container を `<section aria-labelledby>` + `<h3>` 構造に landmark 化、
 * codify (iter101 Kanban / iter81 Workspace と同 pattern 水平展開)。
 *
 * 課題: src/components/schedule/calendar-view.tsx の lane container は
 *   ```tsx
 *   <div className="...rounded-lg border">
 *     <div className="...text-indigo-700">想定 (左 lane)</div>
 *     <div ...><TimelineLane kind="planned" /></div>
 *   </div>
 *   ```
 *   問題:
 *   1. lane が `<div>` で section landmark を持たず、SR ユーザは landmark
 *      navigation で「想定 timeline / 実測 timeline」 区域に直行不可
 *   2. lane title "想定 (左 lane)" が `<div>` で heading semantic 不在
 *   3. lane lable は「左 lane / 右 lane」 と direction 依存表記、SR / RTL ユーザに
 *      位置情報が役に立たず冗長
 *   4. Loader2 spinner に role="status" / aria-label 不在 → SR で「読み込み中」
 *      announce が起きない (iter421 で外側 mutation 用 Loader2 は対応済、内側 lane
 *      lane 用 Loader2 が漏れていた)
 *
 * fix: 1 ファイル ~30 行差分 (各 lane で同 pattern)。
 *   - lane container `<div>` を `<section aria-labelledby="calendar-lane-{kind}-heading">` に
 *   - lane title を `<h3 id="calendar-lane-{kind}-heading">` に + 文言を「想定タイムライン /
 *     実測タイムライン」 (主) + 「左 lane / 右 lane / N 件」 (補助 muted) に分離
 *   - 内側 Loader2 wrapper に `role="status" aria-live="polite"` + Loader2 自体に
 *     `aria-hidden="true"` (iter421 と同 pattern 水平展開)
 *
 * 機能追加なし、視覚 layout (rounded-lg border / grid-cols-2 / gap-3) は不変、
 * shadcn 編集なし。
 *
 * 検証: source-side regex assert で codify。runtime test (Calendar view 描画) は
 *   workspace + schedule seed 必要なため省略。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const path = 'src/components/schedule/calendar-view.tsx'
  const src = readFileSync(resolve(process.cwd(), path), 'utf8')

  // 1. 2 section + aria-labelledby
  for (const kind of ['planned', 'actual']) {
    const re = new RegExp(`<section[^>]*aria-labelledby="calendar-lane-${kind}-heading"`)
    if (re.test(src)) {
      findings.push({ level: 'info', message: `${path}: ${kind} <section> aria-labelledby OK` })
    } else {
      findings.push({
        level: 'warning',
        message: `${path}: ${kind} <section> aria-labelledby 不在`,
      })
    }
  }

  // 2. 2 h3 with id
  for (const kind of ['planned', 'actual']) {
    const re = new RegExp(`<h3[^>]*id="calendar-lane-${kind}-heading"`)
    if (re.test(src)) {
      findings.push({ level: 'info', message: `${path}: ${kind} <h3 id> OK` })
    } else {
      findings.push({ level: 'warning', message: `${path}: ${kind} <h3 id> 不在` })
    }
  }

  // 3. 文言が「想定タイムライン」 / 「実測タイムライン」 になっている
  if (/想定タイムライン/.test(src) && /実測タイムライン/.test(src)) {
    findings.push({ level: 'info', message: `${path}: 想定/実測タイムライン 文言 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: 想定/実測タイムライン 文言 不在` })
  }

  // 4. 内側 Loader2 wrapper の role="status" + aria-live="polite" (2 lane 共通、
  //    iter421 outer Loader2 とは別箇所 — 内側 lane 用)
  const innerLoaderRoleCount = (src.match(/role="status"\s+aria-live="polite"/g) ?? []).length
  if (innerLoaderRoleCount >= 2) {
    findings.push({
      level: 'info',
      message: `${path}: 内側 Loader2 role="status" + aria-live 配線 OK (count=${innerLoaderRoleCount})`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: 内側 Loader2 role="status" + aria-live 配線 不足 (count=${innerLoaderRoleCount})`,
    })
  }

  // 5. 内側 lane 用 Loader2 自身に aria-hidden="true" (各 lane 1 個 = 2 個)。
  //    iter421 で着地した outer mutation Loader2 は role="status" + aria-label="保存中"
  //    の独立 path なので aria-hidden 対象外、本 iter は 2 個追加で OK。
  const innerLoaderAriaHiddenCount = (src.match(/<Loader2[^>]*aria-hidden="true"/g) ?? []).length
  if (innerLoaderAriaHiddenCount >= 2) {
    findings.push({
      level: 'info',
      message: `${path}: 内側 Loader2 aria-hidden カウント ${innerLoaderAriaHiddenCount} (>=2) OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: 内側 Loader2 aria-hidden カウント ${innerLoaderAriaHiddenCount} (<2)`,
    })
  }

  console.log(`\n=== Findings (calendar-lane-section-iter430) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
