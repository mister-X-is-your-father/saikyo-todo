/**
 * Phase 6.15 loop iter1505 (mode-D = aria-label sweep continuation):
 * 校正後 chip aria-label `( ${delta}分、中央値 X× 補正 )` → `— ${delta}分、中央値 X× 補正`
 * を 2 component (active-timer-panel / quick-add) 同時 sweep。
 *
 * Bug: src/components/workspace/active-timer-panel.tsx (line 207) と
 * src/components/workspace/quick-add.tsx (line 268) の calibrated chip
 * (role="img" span) は aria-label が
 *   `校正後 ${minutes}分 (${delta}分、中央値 ${factor}× 補正)`
 * で () 区切が残存。iter1499 engineer / iter1501 MUST / iter1503 start-timer 等の
 * em-dash sweep からこぼれていた。chip は role="img" で aria-label が accessible
 * name、visible は短縮 `→ ${minutes}分` で paren 自体が SR ユーザにのみ届く差分情報。
 *
 * 修正: 両 component の `( ${delta}分、中央値 ${factor}× 補正 )` を
 * `— ${delta}分、中央値 ${factor}× 補正` に統一、iter1499 engineer / iter1501 MUST と
 * 同 punctuation 体系に。
 *
 * 連動 migration: iter440 + iter441 の regression-guard regex 2 ヶ所も em-dash 形式
 * に同 commit で更新 (regex 末尾の `\)` を除去、iter1499 iter874+876 / iter1501
 * iter873+874 / iter1503 iter446 regex 連動 migration と同 pattern)。
 *
 * 経路 B: source-side regex assert + iter440/441 regex pass 確認 + iter1503 /
 * iter1504 invariant cross-check。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-calibrated-chip-em-dash-iter1505.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

function main(): void {
  const findings: Finding[] = []

  const files: { path: string; tag: string; needle: string }[] = [
    {
      path: 'src/components/workspace/active-timer-panel.tsx',
      tag: 'active-timer-panel',
      needle: '校正後 ${calibrated.calibratedMinutes}分',
    },
    {
      path: 'src/components/workspace/quick-add.tsx',
      tag: 'quick-add',
      needle: '校正後 ${formatEstimate(calibrated.calibratedMinutes)}',
    },
  ]

  for (const f of files) {
    const src = readFileSync(resolve(process.cwd(), f.path), 'utf8')
    // 1. 旧 paren `\(...補正\)` が消えている
    if (src.match(new RegExp(f.needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' \\(')) !== null) {
      findings.push({
        level: 'error',
        message: `${f.tag}: calibrated chip aria-label に () 区切が残存`,
      })
    }
    // 2. em-dash 入り
    if (!src.includes(`${f.needle} — `)) {
      findings.push({
        level: 'error',
        message: `${f.tag}: calibrated chip aria-label に em-dash 区切が無い`,
      })
    }
    // 3. 末尾の `補正)` が `補正` に
    if (src.includes('× 補正)`}')) {
      findings.push({
        level: 'error',
        message: `${f.tag}: calibrated chip aria-label 末尾に ) が残存`,
      })
    }
  }

  // 4. iter440 + iter441 regex migration (em-dash 形式)
  const iter440 = readFileSync(
    resolve(process.cwd(), 'scripts/explore-uiux-active-timer-calibration-aria-iter440.ts'),
    'utf8',
  )
  if (iter440.includes('× 補正\\)`')) {
    findings.push({
      level: 'error',
      message: 'iter440.ts: regex が旧 ) 形式のまま (em-dash 移行漏れ)',
    })
  }
  const iter441 = readFileSync(
    resolve(process.cwd(), 'scripts/explore-uiux-quick-add-calibration-aria-iter441.ts'),
    'utf8',
  )
  if (iter441.includes('× 補正\\)`')) {
    findings.push({
      level: 'error',
      message: 'iter441.ts: regex が旧 ) 形式のまま (em-dash 移行漏れ)',
    })
  }

  // 5. iter1503 / iter1504 invariant cross-check
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

  console.log(`\n=== Findings (iter1505 calibrated chip em-dash sweep) ===`)
  if (findings.length === 0)
    console.log(
      '(なし) — 2 calibrated chip em-dash + iter440/441 regex migration + iter1503/1504 invariant OK',
    )
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()
