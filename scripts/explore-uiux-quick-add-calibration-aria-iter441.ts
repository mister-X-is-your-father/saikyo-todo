/**
 * Phase 6.15 loop iter 441 (mode-D Desktop a11y) — QuickAdd preview の見積
 * calibrated chip も iter440 ActiveTimerPanel と同 title= mouse-only 問題が
 * あったため、aria-label に factor 詳細を集約 + role="img" 化、codify。
 *
 * 課題: src/components/workspace/quick-add.tsx の calibrated chip:
 *   ```tsx
 *   <span title={`直近の見積精度に基づく校正値 (中央値 ${factor.toFixed(2)}×)`}
 *         aria-label={`校正後 ${formatEstimate(...)} (...分)`}>
 *   ```
 *   `title=` (mouse only) で「中央値 0.83×」 の calibration factor が SR /
 *   keyboard ユーザに不可達。iter440 ActiveTimerPanel と全く同 pattern。
 *
 * fix: 1 ファイル ~3 行差分 (コメント込み)。
 *   - `title=` 削除、`aria-label` に factor 詳細集約 (例: "校正後 39分 (+9分、
 *     中央値 0.83× 補正)")
 *   - role="img" 追加で children を AT 上隠蔽 (iter98 / iter417 / iter423 /
 *     iter440 と同 pattern)
 *
 * 機能追加なし、視覚 layout 不変、shadcn 編集なし。
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

  const path = 'src/components/workspace/quick-add.tsx'
  const src = readFileSync(resolve(process.cwd(), path), 'utf8')

  // 1. 旧 title="直近の見積精度に基づく校正値" 残存 (regression)
  if (/title=\{`直近の見積精度に基づく校正値/.test(src)) {
    findings.push({
      level: 'error',
      message: `${path}: 旧 quick-add calibrated title 残存 (regression)`,
    })
  } else {
    findings.push({
      level: 'info',
      message: `${path}: 旧 calibrated title 不在 OK`,
    })
  }

  // 2. 新 aria-label に "中央値 ...× 補正" を集約
  if (
    /aria-label=\{`校正後 \$\{formatEstimate\(calibrated\.calibratedMinutes\)\}[\s\S]{0,300}?中央値 \$\{calibrationFactor\?\.toFixed\(2\)\}× 補正`\}/.test(
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

  // 3. role="img" 追加
  if (/data-testid="quick-add-estimate-calibrated"\s+role="img"/.test(src)) {
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

  // 4. iter440 ActiveTimerPanel の同 pattern が消えていないか consistency
  const timerSrc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/active-timer-panel.tsx'),
    'utf8',
  )
  if (/data-testid="active-timer-estimate-calibrated"\s+role="img"/.test(timerSrc)) {
    findings.push({
      level: 'info',
      message: `active-timer-panel: iter440 calibrated role="img" 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `active-timer-panel: iter440 calibrated role="img" 消えた (regression)`,
    })
  }

  console.log(`\n=== Findings (quick-add-calibration-aria-iter441) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
