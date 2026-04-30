/**
 * Phase 6.15 loop iter 480 (mode-D Desktop a11y) —
 * `ScheduleItemPicker` の MUST badge を `MustBadge` 共通 component に置換、codify。
 *
 * 課題: src/components/schedule/schedule-item-picker.tsx 行 71-73 で
 *   `<span className="text-[10px] font-bold text-rose-600">MUST</span>` を
 *   inline 直書きしていた。saikyo-todo は MUST 表示を `MustBadge` に統一する
 *   方針 (must-badge.tsx ヘッダ「graphical 波及シリーズ」) で 6 箇所を統一済だが
 *   schedule-item-picker.tsx は漏れていた。
 *
 * MustBadge との差分:
 *   - role="img" + aria-label="MUST タスク" → SR は MUST タスクと識別可
 *   - AlertTriangle warning icon が visual で警告性を伝える
 *   - bg-red-100 / text-red-700 / ring-red-200 で他箇所と配色統一
 *     (旧 inline は text-rose-600 のみで他箇所と不統一)
 *
 * fix: 1 ファイル ~3 行差分:
 *   - import 追加: `import { MustBadge } from '@/components/workspace/must-badge'`
 *   - 旧 inline span を `<MustBadge data-testid={...} />` に置換
 *
 * 機能追加なし、shadcn 編集なし。
 *
 * 検証: source-side regex assert で codify。
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

  // 1. MustBadge import が追加されている
  if (/import\s+\{\s*MustBadge\s*\}\s+from\s+'@\/components\/workspace\/must-badge'/.test(src)) {
    findings.push({ level: 'info', message: `${path}: MustBadge import OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: MustBadge import 不在` })
  }

  // 2. it.isMust 分岐で MustBadge を使っている
  if (
    /it\.isMust\s*\?\s*<MustBadge\s+data-testid=\{`schedule-picker-must-\$\{it\.id\}`\}\s*\/>/.test(
      src,
    )
  ) {
    findings.push({ level: 'info', message: `${path}: <MustBadge data-testid=...> OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: <MustBadge data-testid> 配線不在` })
  }

  // 3. 旧 inline span (text-rose-600 / MUST 直書き) が消えている
  if (!/text-rose-600">\s*MUST\s*</.test(src) && !/font-bold text-rose-600/.test(src)) {
    findings.push({ level: 'info', message: `${path}: 旧 inline MUST span が消えている OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: 旧 inline MUST span が残存` })
  }

  // 4. iter419 invariant: dialog aria-labelledby + Escape handler 維持
  if (
    /role="dialog"[\s\S]{0,200}?aria-labelledby="schedule-picker-title"/.test(src) &&
    /onKeyDown=\{\(e\) => \{[\s\S]{0,200}?e\.key === 'Escape'[\s\S]{0,100}?onCancel\(\)/.test(src)
  ) {
    findings.push({
      level: 'info',
      message: `${path}: iter419 invariant (dialog labelledby + Escape) 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `${path}: iter419 invariant 破壊` })
  }

  // 5. iter419 invariant: 検索 input aria-label
  if (/aria-label="task を検索"/.test(src)) {
    findings.push({
      level: 'info',
      message: `${path}: iter419 invariant (検索 aria-label) 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: iter419 invariant (検索 aria-label) 破壊`,
    })
  }

  // 6. MustBadge 本体は role="img" + aria-label を持つ (caller 側で重複しない)
  const badgePath = 'src/components/workspace/must-badge.tsx'
  const badgeSrc = readFileSync(resolve(process.cwd(), badgePath), 'utf8')
  if (/role="img"/.test(badgeSrc) && /aria-label="MUST タスク"/.test(badgeSrc)) {
    findings.push({ level: 'info', message: `${badgePath}: MustBadge a11y 正本 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `${badgePath}: MustBadge a11y 正本 破壊` })
  }

  console.log(`\n=== Findings (schedule-picker-must-iter480) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
