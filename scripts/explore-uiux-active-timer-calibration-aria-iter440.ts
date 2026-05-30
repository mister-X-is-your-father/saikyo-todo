/**
 * Phase 6.15 loop iter 440 (mode-D Desktop a11y) — ActiveTimerPanel の見積
 * 校正 chip と itemTitle span の `title=` 系 mouse-only 情報を SR / keyboard
 * 可達化、codify。
 *
 * 課題: src/components/workspace/active-timer-panel.tsx
 *   1. 見積 calibrated chip:
 *      ```tsx
 *      <span title={`直近の見積精度に基づく校正値 (中央値 ${factor.toFixed(2)}×)`}
 *            aria-label={`校正後 ${calibrated.calibratedMinutes}分 (...)`}>
 *      ```
 *      `title=` (mouse only) で「中央値 0.83×」 等の calibration factor source
 *      が SR / keyboard ユーザに伝わらない。aria-label には校正後の minutes
 *      だけで factor 不在 → SR ユーザは「なぜこの校正値?」 source 不透明。
 *
 *   2. itemTitle span: `title={itemTitle ?? ''}` で itemTitle が null の時に
 *      空文字 title を render (no-op だが冗長、cleaner: `|| undefined`)
 *
 * fix: 1 ファイル ~3 行差分。
 *   - 見積 calibrated chip: `title=` 削除、`aria-label` に factor 詳細を集約
 *     (例: "校正後 39分 (+9分、中央値 0.83× 補正)")
 *   - role="img" 追加で children を AT 上隠蔽 (iter98 / iter417 / iter423 と同
 *     pattern)
 *   - itemTitle span: `title={itemTitle ?? ''}` → `title={itemTitle || undefined}`
 *     (null/empty 時に title 属性自体をレンダしない)
 *
 * 機能追加なし、視覚 layout / 色 / 文字サイズ 全て不変、shadcn 編集なし。
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

  const path = 'src/components/workspace/active-timer-panel.tsx'
  const src = readFileSync(resolve(process.cwd(), path), 'utf8')

  // 1. 旧 title=`直近の見積精度に基づく校正値` 残存 (regression)
  if (/title=\{`直近の見積精度に基づく校正値/.test(src)) {
    findings.push({
      level: 'error',
      message: `${path}: 旧 calibrated title="直近の見積精度に基づく..." 残存 (regression)`,
    })
  } else {
    findings.push({
      level: 'info',
      message: `${path}: 旧 calibrated title 不在 OK`,
    })
  }

  // 2. 新 aria-label に "中央値 ...× 補正" を集約
  if (
    /aria-label=\{`校正後 \$\{calibrated\.calibratedMinutes\}分[\s\S]{0,200}?中央値 \$\{calibrationFactor\?\.toFixed\(2\)\}× 補正`\}/.test(
      src,
    )
  ) {
    findings.push({
      level: 'info',
      message: `${path}: calibrated aria-label に factor 集約 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: calibrated aria-label factor 集約 不在`,
    })
  }

  // 3. role="img" 追加 (iter98 / iter417 / iter423 と同 pattern)
  if (/data-testid="active-timer-estimate-calibrated"\s+role="img"/.test(src)) {
    findings.push({
      level: 'info',
      message: `${path}: calibrated chip role="img" 追加 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: calibrated chip role="img" 不在`,
    })
  }

  // 4. itemTitle span: title={itemTitle || undefined} (空文字 render 回避)
  if (/title=\{itemTitle \|\| undefined\}/.test(src)) {
    findings.push({
      level: 'info',
      message: `${path}: itemTitle span title={itemTitle || undefined} OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: itemTitle span title 修正 不在`,
    })
  }

  // 5. 旧 title={itemTitle ?? ''} 残存 (regression)
  if (/title=\{itemTitle \?\? ''\}/.test(src)) {
    findings.push({
      level: 'error',
      message: `${path}: 旧 title={itemTitle ?? ''} 残存 (regression — 空文字 title)`,
    })
  } else {
    findings.push({
      level: 'info',
      message: `${path}: 旧 title={itemTitle ?? ''} 不在 OK`,
    })
  }

  // 6. iter426 invariant: elapsed span aria-live 不在 維持
  if (
    /data-testid="active-timer-elapsed"[\s\S]{0,200}?aria-live="polite"/.test(src) ||
    /aria-live="polite"[\s\S]{0,200}?data-testid="active-timer-elapsed"/.test(src)
  ) {
    findings.push({
      level: 'error',
      message: `${path}: iter426 elapsed span aria-live="polite" 復活 (regression)`,
    })
  } else {
    findings.push({
      level: 'info',
      message: `${path}: iter426 invariant 維持 OK`,
    })
  }

  console.log(`\n=== Findings (active-timer-calibration-aria-iter440) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
