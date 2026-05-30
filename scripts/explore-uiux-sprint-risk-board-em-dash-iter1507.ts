/**
 * Phase 6.15 loop iter1507 (mode-D = aria-label sweep continuation):
 * sprint-risk-board-widget.tsx の item button (line 119-121) で aria-label が
 * `${title} を開く (risk score ${X} / 理由 ${Y} 件)` で () 区切が残存。iter1493 副
 * operation-board と同 `${title} を開く (descriptive)` pattern を本 widget でも
 * em-dash 化。
 *
 * Bug: src/components/sprint/sprint-risk-board-widget.tsx の risk top item button
 * (`role="button"`) は aria-label が
 *   `${title} を開く (risk score ${riskScore}${reasonsAppend})`
 * で () 区切が残存。iter1499 / iter1501 / iter1503 / iter1504 / iter1505 の
 * em-dash sweep からこぼれていた (visible-prefix `${title}` 保持、paren 内に
 * risk score + 理由数の structural metadata)。
 *
 * 修正: `( risk score X / 理由 Y 件 )` → `— risk score X / 理由 Y 件` に統一、
 * iter1493 副 operation-board / iter1505 calibrated-chip と同 punctuation 体系に。
 *
 * 連動 migration: iter601 / iter602 / iter603 の regression-guard regex 3 ヶ所も
 * em-dash 形式に同 commit で更新 (iter1499/1501/1503/1505 regex 連動 migration と
 * 同 pattern)。
 *
 * 経路 B: source-side regex assert + iter601/602/603 regex pass 確認 +
 * iter1504/1505 invariant cross-check。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-sprint-risk-board-em-dash-iter1507.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

function main(): void {
  const findings: Finding[] = []

  const srbw = readFileSync(
    resolve(process.cwd(), 'src/components/sprint/sprint-risk-board-widget.tsx'),
    'utf8',
  )

  // 1. 旧 paren が消えている
  if (srbw.includes('を開く (risk score ${entry.riskScore}')) {
    findings.push({
      level: 'error',
      message: 'sprint-risk-board-widget.tsx: aria-label に () 区切が残存',
    })
  }
  // 2. em-dash が入っている
  if (!srbw.includes('を開く — risk score ${entry.riskScore}')) {
    findings.push({
      level: 'error',
      message: 'sprint-risk-board-widget.tsx: aria-label に em-dash 区切が無い',
    })
  }
  // 3. 末尾の `)` が消えている (3 行 template literal)
  if (srbw.match(/' \/ 理由 \$\{entry\.reasons\.length\} 件' : ''\s*\n\s*\}\)`/) !== null) {
    findings.push({
      level: 'error',
      message: 'sprint-risk-board-widget.tsx: aria-label 末尾の `)` が残存',
    })
  }

  // 4. iter601/602/603 regex migration (em-dash 形式)
  const iter601 = readFileSync(
    resolve(process.cwd(), 'scripts/explore-uiux-gantt-jump-today-aria-iter601.ts'),
    'utf8',
  )
  if (iter601.includes('を開く \\(risk score')) {
    findings.push({
      level: 'error',
      message: 'iter601.ts: regex が旧 ( 形式のまま (em-dash 移行漏れ)',
    })
  }
  const iter602 = readFileSync(
    resolve(process.cwd(), 'scripts/explore-uiux-gantt-today-line-aria-iter602.ts'),
    'utf8',
  )
  if (iter602.includes('を開く \\(risk score')) {
    findings.push({
      level: 'error',
      message: 'iter602.ts: regex が旧 ( 形式のまま (em-dash 移行漏れ)',
    })
  }
  const iter603 = readFileSync(
    resolve(process.cwd(), 'scripts/explore-uiux-item-edit-sprint-aria-iter603.ts'),
    'utf8',
  )
  if (iter603.includes('を開く \\(risk score')) {
    findings.push({
      level: 'error',
      message: 'iter603.ts: regex が旧 ( 形式のまま (em-dash 移行漏れ)',
    })
  }

  // 5. iter1504 / iter1505 invariant cross-check
  const bp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/budget-panel.tsx'),
    'utf8',
  )
  if (!bp.includes('AI 月次コスト消費率 ${ratioPct}% — 警告閾値 ${rateToPct(s.warnThreshold)}%')) {
    findings.push({
      level: 'error',
      message: 'budget-panel.tsx: iter1504 invariant 喪失',
    })
  }
  const stb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/start-timer-button.tsx'),
    'utf8',
  )
  if (
    !stb.includes(
      '「${item.title}」を計測中 — 経過 ${formatElapsed(elapsedFn())}、右下 panel で停止',
    )
  ) {
    findings.push({
      level: 'error',
      message: 'start-timer-button.tsx: iter1503 invariant 喪失',
    })
  }

  console.log(`\n=== Findings (iter1507 sprint-risk-board em-dash sweep) ===`)
  if (findings.length === 0)
    console.log(
      '(なし) — sprint-risk-board aria-label em-dash + iter601/602/603 regex migration + iter1503/1504 invariant OK',
    )
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()
