/**
 * Phase 6.15 loop iter1503 (mode-D = aria-label sweep + visible-aria parity):
 * start-timer-button.tsx の isMine ブロック (line 64) で aria-label が paren 区切、
 * visible span (line 71) が em-dash 区切で format divergence していたのを統一。
 *
 * Bug: src/components/workspace/start-timer-button.tsx の isMine 経路は
 *   role="img" の div で aria-label が
 *     `「${item.title}」を計測中 (経過 ${X}、右下 panel で停止)`
 *   一方 visible span (line 71) は既に em-dash 形式:
 *     `計測中 — 右下 panel で停止`
 *   WCAG 2.5.3 (Label in Name) 観点: aria-label と visible は format 一致が望ましく、
 *   両方 em-dash 区切に統一すれば SR ユーザ (aria-label) と sighted ユーザ
 *   (visible) の mental model 同期。iter1500 gantt bar aria-title parity fix と
 *   同 root cause、本 div 版。
 *
 * 修正: aria-label の paren を em-dash に統一:
 *   `「${title}」を計測中 — 経過 ${X}、右下 panel で停止`
 * visible span は元から em-dash で不変。これで SR / sighted 体験が一致。
 *
 * 連動 migration: iter446 の regression-guard regex も em-dash 形式に同 commit で
 * 更新 (検証目的 = role="img" + 集約 aria-label の存在 guard で paren 自体は
 * 本質的 invariant ではないため、iter1494 副 iter798 / iter1499 iter874+876 /
 * iter1501 iter873+874 regex 連動 migration と同 pattern)。
 *
 * 経路 B: source-side regex assert + iter1500 gantt bar parity / iter1501 MUST
 * 3 component invariant cross-check。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-start-timer-active-em-dash-iter1503.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

function main(): void {
  const findings: Finding[] = []

  const stb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/start-timer-button.tsx'),
    'utf8',
  )

  // 1. aria-label に旧 paren 区切が残存していない
  if (
    stb.includes(
      '「${item.title}」を計測中 (経過 ${formatElapsed(elapsedFn())}、右下 panel で停止)',
    )
  ) {
    findings.push({
      level: 'error',
      message: 'start-timer-button.tsx: isMine aria-label に () 区切が残存',
    })
  }
  // 2. aria-label に em-dash 区切が入っている
  if (
    !stb.includes(
      '「${item.title}」を計測中 — 経過 ${formatElapsed(elapsedFn())}、右下 panel で停止',
    )
  ) {
    findings.push({
      level: 'error',
      message: 'start-timer-button.tsx: isMine aria-label に em-dash 区切が無い',
    })
  }
  // 3. visible span は元の em-dash 形式維持
  if (!stb.includes('計測中 — 右下 panel で停止')) {
    findings.push({
      level: 'error',
      message: 'start-timer-button.tsx: visible span em-dash 形式 喪失',
    })
  }
  // 4. iter446 regex migration (em-dash 形式)
  const iter446 = readFileSync(
    resolve(process.cwd(), 'scripts/explore-uiux-start-timer-aria-live-iter446.ts'),
    'utf8',
  )
  if (iter446.includes('を計測中 \\(経過')) {
    findings.push({
      level: 'error',
      message: 'iter446.ts: regex が旧 () 形式のまま (em-dash 移行漏れ)',
    })
  }

  // 5. iter1500 gantt bar parity invariant cross-check (回帰 guard)
  const gantt = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'),
    'utf8',
  )
  if (!gantt.includes("'依存線を表示中 — クリックで非表示'")) {
    findings.push({
      level: 'error',
      message: 'gantt-view.tsx: iter1495 invariant 喪失',
    })
  }
  // 6. iter1501 MUST 3 component invariant cross-check (回帰 guard)
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (!ied.includes("'MUST が ON: 絶対落とさない — DoD 必須、クリックで OFF'")) {
    findings.push({
      level: 'error',
      message: 'item-edit-dialog.tsx: iter1501 invariant 喪失',
    })
  }

  console.log(`\n=== Findings (iter1503 start-timer active em-dash parity) ===`)
  if (findings.length === 0)
    console.log(
      '(なし) — start-timer isMine aria-label em-dash + iter446 regex migration + iter1495/1501 invariant OK',
    )
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()
