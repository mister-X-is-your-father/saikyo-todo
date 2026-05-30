/**
 * Phase 6.15 loop iter1504 (mode-D = progressbar aria-label/valuetext parity sweep):
 * budget-panel.tsx progressbar (line 164-169) で aria-label が paren `( 警告閾値 X% )`、
 * aria-valuetext が em-dash `— state` で format divergence していたのを統一。
 *
 * Bug: src/components/workspace/budget-panel.tsx の AI 月次コスト消費率
 * progressbar:
 *   aria-label    = `AI 月次コスト消費率 ${ratio}% (警告閾値 ${threshold}%)`
 *   aria-valuetext = `${ratio}% — ${state}`
 * 同一 progressbar 内の aria-label と aria-valuetext で paren / em-dash の punctuation
 * 体系が divergent。iter1501 副 sprint-card progressbar / iter1502 sprint-retro-widget
 * progressbar / iter1503 副 PDCA cycle progressbar と同 root cause。
 *
 * 修正: aria-label の `( 警告閾値 X% )` を `— 警告閾値 X%` に統一、aria-valuetext と
 * 同 em-dash 体系に。iter488 regression-guard regex は prefix `AI 月次コスト消費率`
 * のみ match で本変更影響無く touch 不要。これで Sprint / Sprint-Retro / Goal /
 * PDCA / Budget progressbar の punctuation 統一完了 (KR は iter757 deferred 継続)。
 *
 * 経路 B: source-side regex assert + iter488 prefix regex 維持確認 + iter1501 副 /
 * iter1502 / iter1503 副 invariant cross-check。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-budget-progressbar-em-dash-iter1504.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

function main(): void {
  const findings: Finding[] = []

  const bp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/budget-panel.tsx'),
    'utf8',
  )

  // 1. aria-label に旧 paren 区切が残存していない
  if (bp.includes('% (警告閾値 ${rateToPct(s.warnThreshold)}%)')) {
    findings.push({
      level: 'error',
      message: 'budget-panel.tsx: progressbar aria-label に () 区切が残存',
    })
  }
  // 2. aria-label に em-dash 区切が入っている
  if (!bp.includes('AI 月次コスト消費率 ${ratioPct}% — 警告閾値 ${rateToPct(s.warnThreshold)}%')) {
    findings.push({
      level: 'error',
      message: 'budget-panel.tsx: progressbar aria-label に em-dash 区切が無い',
    })
  }
  // 3. aria-valuetext は元から em-dash 形式 (回帰 guard)
  if (
    !bp.includes(
      "aria-valuetext={`${ratioPct}% — ${s.exceeded ? '上限到達' : s.warnTriggered ? '警告' : '正常'}`}",
    )
  ) {
    findings.push({
      level: 'error',
      message: 'budget-panel.tsx: progressbar aria-valuetext em-dash 形式 喪失',
    })
  }
  // 4. iter488 prefix regex 維持 (回帰 guard)
  if (!bp.includes('aria-label={`AI 月次コスト消費率')) {
    findings.push({
      level: 'error',
      message: 'budget-panel.tsx: iter488 prefix invariant 喪失',
    })
  }

  // 5. iter1503 start-timer parity invariant (回帰 guard)
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
      message: 'start-timer-button.tsx: iter1503 parity invariant 喪失',
    })
  }
  // 6. iter1501 MUST 3 component invariant (回帰 guard)
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

  console.log(`\n=== Findings (iter1504 budget progressbar em-dash parity) ===`)
  if (findings.length === 0)
    console.log('(なし) — budget progressbar aria-label em-dash + iter488/1501/1503 invariant OK')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()
