/**
 * Phase 6.15 loop iter 423 (mode-D Desktop a11y) — `SeverityChip` 共通 widget
 * の **static path** が `role="status"` (live region) を誤用していた問題を
 * 修正、codify。
 *
 * 課題: src/components/shared/severity-chip.tsx の static (non-onClick) path
 *   ```tsx
 *   <span role="status" aria-label={...}>
 *     {inner}
 *   </span>
 *   ```
 *   `role="status"` は **live region** (= aria-live="polite" implicit) なので
 *   SR は **chip が DOM に出現するたび再 announce** してしまう。dashboard /
 *   diff-summary 等で chip を多数描画する画面では「ok ok warn ok danger ...」
 *   と読み上げが連続発火し UX 破綻。
 *
 *   role="status" の本来用途は「処理中 / 完了通知 等の一過性 advisory text」で、
 *   永続的な classification chip には不適切 (WAI-ARIA spec 違反)。
 *
 * fix: 1 ファイル 1 行 (+ コメント 3 行) の差分。
 *   - `role="status"` → `role="img"` に変更
 *   - iter98 PDCA bar / iter417 TaskChute priority chip と同 pattern
 *     (atomic visual group + aria-label)
 *   - role="img" は live region ではないので再 announce されない、
 *     SR は chip 1 個を「画像: ${aria-label}」として一括認識
 *
 * 機能追加なし、視覚 layout 不変、aria-label 既存維持、shadcn 編集なし。
 *
 * 検証: source-side regex assert で codify。runtime (dashboard 描画) は workspace
 *   seed 必要なため省略。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const path = 'src/components/shared/severity-chip.tsx'
  const src = readFileSync(resolve(process.cwd(), path), 'utf8')

  // 1. JSX 上で role="status" 残存していないか (regression detector — 行頭の
  //    `<span role="status"` 等を検出、コメント中の説明文字列は除外)
  if (/<span\s+role="status"/.test(src)) {
    findings.push({
      level: 'error',
      message: `${path}: <span role="status"> 残存 (regression — live region 誤用)`,
    })
  } else {
    findings.push({
      level: 'info',
      message: `${path}: <span role="status"> 不在 (live region 誤用 解消)`,
    })
  }

  // 2. role="img" + aria-label 配線 (atomic chip pattern)
  if (
    /<span\s+role="img"\s+className=\{baseCls\}\s+aria-label=\{ariaLabel \?\? label\}/.test(src)
  ) {
    findings.push({ level: 'info', message: `${path}: role="img" + aria-label 配線 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: role="img" + aria-label 配線 不在` })
  }

  // 3. button path (onClick あり) は role 不要 (HTML button が implicit role) のままか
  // (button 経路が role="img" を貰ってしまうと役割が壊れる)
  if (/<button\s+type="button"\s+onClick=\{onClick\}/.test(src)) {
    findings.push({ level: 'info', message: `${path}: button path role 無し OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: button path 構造変化 (regression?)` })
  }

  // 4. iter417 / iter98 の同 pattern (consistency check)
  const taskchuteSrc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/taskchute-view.tsx'),
    'utf8',
  )
  if (/role="img"\s+aria-label=\{priorityLabel/.test(taskchuteSrc)) {
    findings.push({ level: 'info', message: `taskchute-view.tsx: role="img" pattern 維持 OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `taskchute-view.tsx: role="img" pattern が消えた (regression)`,
    })
  }

  console.log(`\n=== Findings (severity-chip-role-iter423) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
