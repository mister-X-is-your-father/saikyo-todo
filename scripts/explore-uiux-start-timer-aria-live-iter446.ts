/**
 * Phase 6.15 loop iter 446 (mode-D Desktop a11y) — StartTimerButton の "計測中"
 * inline display で 1 秒 tick の formatElapsed 更新が `role="status"
 * aria-live="polite"` で SR queue を flood する 1Hz anti-pattern を修正、codify
 * (iter426 ActiveTimerPanel elapsed span と同 pattern 水平展開)。
 *
 * 課題: src/components/workspace/start-timer-button.tsx の `isMine` branch:
 *   ```tsx
 *   <div role="status" aria-live="polite">
 *     <Timer />
 *     <span>{formatElapsed(elapsedFn())}</span>  // 1 秒 tick で更新
 *     <span>計測中 — 右下 panel で停止</span>
 *   </div>
 *   ```
 *   - 1Hz の tick で children が再 render → SR が「Timer 00:01 計測中…」「Timer
 *     00:02 計測中…」を毎秒 announce → 操作 noise (iter426 と全く同じ問題)
 *
 * fix: 1 ファイル ~9 行差分 (コメント込み)。
 *   - `role="status" aria-live="polite"` → `role="img" aria-label="集約 text"` に
 *     切替え。aria-label に title + 経過時間 + "計測中" を集約 (例: "「Foo」を
 *     計測中 (経過 1:23、右下 panel で停止)")
 *   - 3 visible children (Timer icon / formatElapsed span / 計測中 text) に
 *     `aria-hidden="true"` を付与し、AT 上は aria-label が単一 source に
 *
 * 機能追加なし、視覚 layout 不変、shadcn 編集なし。
 *
 * 検証: source-side regex assert + iter426 invariant consistency check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const path = 'src/components/workspace/start-timer-button.tsx'
  const src = readFileSync(resolve(process.cwd(), path), 'utf8')

  // 1. 旧 role="status" aria-live="polite" 残存 (regression — start-timer-active block)
  if (
    /data-testid=\{`start-timer-active-\$\{item\.id\}`\}[\s\S]{0,300}?role="status"[\s\S]{0,200}?aria-live="polite"/.test(
      src,
    )
  ) {
    findings.push({
      level: 'error',
      message: `${path}: 旧 role="status" + aria-live="polite" 残存 (regression — 1Hz flood)`,
    })
  } else {
    findings.push({
      level: 'info',
      message: `${path}: 旧 role="status" + aria-live="polite" 不在 OK`,
    })
  }

  // 2. 新 role="img" + aria-label 集約配線
  if (
    /data-testid=\{`start-timer-active-\$\{item\.id\}`\}[\s\S]{0,300}?role="img"[\s\S]{0,400}?aria-label=\{`「\$\{item\.title\}」を計測中 — 経過 \$\{formatElapsed\(elapsedFn\(\)\)\}/.test(
      src,
    )
  ) {
    findings.push({
      level: 'info',
      message: `${path}: role="img" + 集約 aria-label OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: role="img" + 集約 aria-label 不在`,
    })
  }

  // 3. 3 visible children に aria-hidden="true" (Timer icon は元からあったが、
  //    formatElapsed span / "計測中" span が新規追加対象)
  const ariaHiddenInIsMineCount = (src.match(/<span[^>]*aria-hidden="true"/g) ?? []).length
  // Timer icon は既存だったが span 2 個が新規。global で >=2 個あればよい。
  if (ariaHiddenInIsMineCount >= 2) {
    findings.push({
      level: 'info',
      message: `${path}: aria-hidden span カウント ${ariaHiddenInIsMineCount} OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: aria-hidden span カウント ${ariaHiddenInIsMineCount} <2`,
    })
  }

  // 4. iter426 invariant consistency (active-timer-panel の elapsed span が aria-hidden 維持)
  const timerSrc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/active-timer-panel.tsx'),
    'utf8',
  )
  if (/data-testid="active-timer-elapsed"[\s\S]{0,200}?aria-hidden="true"/.test(timerSrc)) {
    findings.push({
      level: 'info',
      message: `active-timer-panel: iter426 elapsed span aria-hidden 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `active-timer-panel: iter426 elapsed span aria-hidden 消えた (regression)`,
    })
  }

  console.log(`\n=== Findings (start-timer-aria-live-iter446) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
