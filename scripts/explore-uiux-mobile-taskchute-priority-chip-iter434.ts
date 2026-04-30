/**
 * Phase 6.15 loop iter 434 (mode-M Mobile audit) — TaskChute view (iter519
 * 1 列 timeline) の priority chip が visible text に "優先度: 最優先 (p1)"
 * (10 char @10px font ≈ 90px 幅) を直接出していて mobile 375px 幅で title
 * truncate を圧迫していた問題を compact 化、codify。
 *
 * 課題: src/components/workspace/taskchute-view.tsx の row layout (mobile 375px):
 *   - time chip w-12 (48px)
 *   - ItemCheckbox (~24px)
 *   - title (flex-1 truncate)
 *   - MustBadge (~25px)
 *   - **priority chip "優先度: 最優先 (p1)" (~90px @10px)** ← 過大
 *   - StatusBadge (~50px)
 *   - StartTimerButton (~32px)
 *   非 flex 要素 + gap = ~340-370px、title に ~5-35px しか残らず常時 truncate。
 *
 *   iter417 (mode-D) で `aria-label` 重複 prefix を解消した時に visible text の
 *   verbose は「次 iter 候補」 と HANDOFF §9 に残してあったのを iter434 mode-M で
 *   消化。
 *
 * fix: 1 ファイル ~10 行差分 (コメント込み)。
 *   - visible text "優先度: 最優先 (p1)" → "P{n}" (3 char, ~24px) に compact 化
 *   - aria-label は priorityLabel フル text を温存 (SR 読み上げ劣化なし)
 *   - role="img" 維持で children を AT 上隠蔽 (iter98 / iter417 / iter423 と
 *     同 pattern)
 *
 * 機能追加なし、視覚 layout (chip 高さ / 色 / position) は維持、文字数のみ縮小。
 * shadcn 編集なし、aria-label 既存維持。
 *
 * 検証: source-side regex assert で codify。runtime mobile audit (workspace seed
 *   必要 + dev server 不安定) は ChannelHandoff §9 で文字 record。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const path = 'src/components/workspace/taskchute-view.tsx'
  const src = readFileSync(resolve(process.cwd(), path), 'utf8')

  // 1. visible text が "P{item.priority ?? 4}" になっている (compact)
  if (/>\s*P\{item\.priority \?\? 4\}\s*<\/span>/.test(src)) {
    findings.push({ level: 'info', message: `${path}: visible text "P{n}" compact OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: visible text "P{n}" 不在` })
  }

  // 2. 旧 visible text {priorityLabel(item.priority)} 残存 detector (regression)
  if (/>\s*\{priorityLabel\(item\.priority\)\}\s*<\/span>/.test(src)) {
    findings.push({
      level: 'error',
      message: `${path}: 旧 visible text {priorityLabel(...)} 残存 (regression — verbose text 復活)`,
    })
  } else {
    findings.push({
      level: 'info',
      message: `${path}: 旧 visible text {priorityLabel(...)} 不在 OK`,
    })
  }

  // 3. role="img" + aria-label={priorityLabel(item.priority)} 維持 (iter417 invariant)
  if (/role="img"\s+aria-label=\{priorityLabel\(item\.priority\)\}/.test(src)) {
    findings.push({
      level: 'info',
      message: `${path}: role="img" + aria-label={priorityLabel} 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: role="img" + aria-label 構造 消えた (iter417 regression)`,
    })
  }

  console.log(`\n=== Findings (mobile-taskchute-priority-chip-iter434) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
