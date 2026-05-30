/**
 * Phase 6.15 loop iter 762 (mode-D Desktop a11y) —
 * notification-preferences ボタンの aria-label に現在 ON 件数を含めて拡張
 * (iter727-761 件数動的化 sweep の続き、icon button level の小 polish)。
 *
 * 課題: notification-preferences.tsx 行 112 の aria-label="通知設定 (メール通知 4 種を
 *   ON/OFF)" は静的で「現在何種が ON か」 が button focus 時に分からない。SR ユーザは
 *   button click → popover 開いて状態確認 する step を踏む必要があった。
 *
 * fix (1 ファイル ~10 行差分):
 *   - aria-label を `通知設定 (メール通知 ${onCount}/${TOGGLES.length} 種 ON)` に動的化
 *   - data fetch 中は static fallback (旧 label と同じ)
 *   - onCount は TOGGLES.filter で計算 (data の key を boolean coerce)
 *
 * 検証: source-side regex assert + iter727-761 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const np = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/notification-preferences.tsx'),
    'utf8',
  )

  // 1. notification-preferences button 動的 aria-label
  const hasOnCountVar =
    /const onCount = data\s*\n?\s*\? TOGGLES\.filter\(\(t\) => Boolean\(data\[t\.key as keyof typeof data\]\)\)\.length\s*\n?\s*: null/.test(
      np,
    )
  // iter1505: () → em-dash migration (iter1093-1504 sweep に追従、検証目的 = onCount 動的
  // content 存在の guard で punctuation は本質的 invariant ではない)
  const hasDynamicLabel =
    /aria-label=\{\s*\n?\s*onCount !== null\s*\n?\s*\? `通知設定 — メール通知 \$\{onCount\}\/\$\{TOGGLES\.length\} 種 ON`\s*\n?\s*: '通知設定 — メール通知 4 種を ON\/OFF'/.test(
      np,
    )

  if (hasOnCountVar && hasDynamicLabel) {
    findings.push({
      level: 'info',
      message: `notification-preferences button 動的 aria-label OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `notification-preferences button 動的 aria-label 不完全 (var=${hasOnCountVar} label=${hasDynamicLabel})`,
    })
  }

  // 2. iter761 invariant: Sprint progressbar 維持
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`Sprint「\$\{sprint\.name\}」完了率 \$\{pct\}% \(\$\{done\}\/\$\{total\} 件、\$\{sprintProgressToneLabel\(tone\)\}\)`\}/.test(
      sp,
    )
  ) {
    findings.push({ level: 'info', message: `iter761 invariant: Sprint progressbar 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter761 invariant: 破壊` })
  }

  // 3. iter760 invariant: Goal 全体進捗 progressbar 維持
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`Goal「\$\{goal\.title\}」全体進捗 \$\{goalPct\}%\$\{health \? ` \(\$\{health\.label\}\)` : ''\}`\}/.test(
      gp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter760 invariant: Goal 全体進捗 progressbar 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter760 invariant: 破壊` })
  }

  // 4. iter759 invariant: sprint-retro progressbar 維持
  const sr = readFileSync(
    resolve(process.cwd(), 'src/components/sprint/sprint-retro-widget.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`Sprint Retro 完了率 \$\{summary\.completionRate\}% \(\$\{completionRateSeverityLabelJa\(sev\)\}\)`\}/.test(
      sr,
    )
  ) {
    findings.push({ level: 'info', message: `iter759 invariant: sprint-retro progressbar 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter759 invariant: 破壊` })
  }

  // 5. iter755 race invariant: data-widget-card region 維持
  const dwc = readFileSync(
    resolve(process.cwd(), 'src/components/shared/data-widget-card.tsx'),
    'utf8',
  )
  if (/aria-label=\{count !== undefined \? `\$\{title\} \(\$\{count\} 件\)` : title\}/.test(dwc)) {
    findings.push({
      level: 'info',
      message: `iter755 race invariant: DataWidgetCard region 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter755 race invariant: 破壊` })
  }

  console.log(`\n=== Findings (notification-preferences-button-iter762) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
