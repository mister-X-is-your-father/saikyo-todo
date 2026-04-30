/**
 * Phase 6.15 loop iter 426 (mode-D Desktop a11y) — ActiveTimerPanel の経過時間
 * span が `aria-live="polite"` で 1 秒 tick ごとに SR を flood していた
 * a11y アンチパターンを修正、codify。
 *
 * 課題: src/components/workspace/active-timer-panel.tsx
 *   ```tsx
 *   <span aria-live="polite" aria-atomic="true">
 *     {formatElapsed(elapsedMs)}
 *   </span>
 *   ```
 *   `aria-live="polite"` + `aria-atomic="true"` で 1 秒ごとに更新される値が
 *   announce queue に積まれ、SR が「00:01 00:02 00:03 ...」と無限に読み続ける。
 *   "polite" は「current speech が終わってから」 announce されるが、1Hz 更新では
 *   queue が肥大化し追いつけない。WAI-ARIA / WCAG ベストプラクティスでは
 *   タイマー / clock 表示には aria-live を使わず、ユーザが必要時に navigate
 *   する on-demand pattern が推奨。
 *
 *   ※ コンテナ側 `<div role="region" aria-label="タスクタイマー (経過 X)">` が
 *      aria-label に経過時間を含めて render しているため、SR ユーザは region に
 *      navigate すれば現在値を聞ける。
 *
 * fix: 1 ファイル ~7 行差分 (コメント込み)。
 *   - inner span から `aria-live="polite"` + `aria-atomic="true"` を削除
 *   - 代わりに `aria-hidden="true"` を付与 (container aria-label が単一
 *     accessible name source、span は visible-only)
 *   - 理由を 5 行コメントで documenting (再導入の risk を防止)
 *
 * 機能追加なし、視覚 layout / 計測 / formatElapsed 表示 全て不変、
 * shadcn 編集なし。typecheck / lint 緑。
 *
 * 検証: source-side regex assert で codify。runtime test (timer 走行) は
 *   workspace + item seed 必要なため省略。
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

  // 1. inner elapsed span に aria-live="polite" が残ってないか (regression detector)
  if (
    /data-testid="active-timer-elapsed"[\s\S]{0,200}?aria-live="polite"/.test(src) ||
    /aria-live="polite"[\s\S]{0,200}?data-testid="active-timer-elapsed"/.test(src)
  ) {
    findings.push({
      level: 'error',
      message: `${path}: elapsed span に aria-live="polite" 残存 (regression — 1Hz flood)`,
    })
  } else {
    findings.push({
      level: 'info',
      message: `${path}: elapsed span aria-live 不在 (1Hz flood 解消)`,
    })
  }

  // 2. inner elapsed span は aria-hidden="true" になっているか
  if (/data-testid="active-timer-elapsed"[\s\S]{0,200}?aria-hidden="true"/.test(src)) {
    findings.push({
      level: 'info',
      message: `${path}: elapsed span aria-hidden 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: elapsed span aria-hidden 不在`,
    })
  }

  // 3. コンテナの aria-label に formatElapsed が含まれている (on-demand query 経路 維持)
  if (
    /role="region"[\s\S]{0,200}?aria-label=\{`タスクタイマー \(経過 \$\{formatElapsed\(elapsedMs\)\}\$\{running \? ' 計測中' : ' 一時停止中'\}\)`\}/.test(
      src,
    )
  ) {
    findings.push({
      level: 'info',
      message: `${path}: コンテナ aria-label に formatElapsed 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: コンテナ aria-label が消えた (regression)`,
    })
  }

  console.log(`\n=== Findings (active-timer-aria-live-iter426) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
