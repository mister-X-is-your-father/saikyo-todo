/**
 * Phase 6.15 loop iter 726 (mode-D Desktop a11y) —
 * today-view 静的キーボードヒント `<p>` の aria-live="polite" 誤用を解消
 * (iter443 inbox-view と同 anti-pattern 修正)。
 *
 * 課題: today-view.tsx 行 172 の `<p aria-live="polite">キーボード: ... </p>` は
 *   静的命令文に live region を付与している。SR は値変更時の再 announce 想定なので、
 *   再 render のたびに "キーボード: ..." を読み上げる anti-pattern (iter443 で
 *   inbox-view の同じ問題を修正済)。
 *
 * fix (1 ファイル ~5 行差分):
 *   - aria-live="polite" を削除 (通常 reading 順で 1 回読み上げれば十分)
 *
 * 検証: source-side regex assert + iter701-725 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const tv = readFileSync(resolve(process.cwd(), 'src/components/workspace/today-view.tsx'), 'utf8')

  // 1. 静的キーボードヒントから aria-live 削除 (iter726 comment が存在 + p element は aria-live なし)
  const hasIter726Comment = /iter726: 静的キーボードヒントは aria-live="polite" の誤用/.test(tv)
  // ヒント p tag の前後で aria-live が付いていないことを確認
  const hintRegex = /<p className="text-muted-foreground text-xs">\s*\n\s*キーボード: j\/k で移動/
  if (hasIter726Comment && hintRegex.test(tv)) {
    findings.push({
      level: 'info',
      message: `today-view 静的キーボードヒント aria-live 削除 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `today-view 静的キーボードヒント aria-live 削除 不完全`,
    })
  }

  // 2. iter725 invariant: calendar nav group 維持
  const cv = readFileSync(
    resolve(process.cwd(), 'src/components/schedule/calendar-view.tsx'),
    'utf8',
  )
  if (
    /role="group"\s*\n\s*aria-label="カレンダー日付ナビゲーション \(前日 \/ 翌日 \/ 今日\)"/.test(
      cv,
    )
  ) {
    findings.push({ level: 'info', message: `iter725 invariant: calendar nav group 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter725 invariant: 破壊` })
  }

  // 3. iter724 invariant: top-items ol 維持
  const tic = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/top-items-by-time-chip.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`直近 \$\{WINDOW_DAYS\} 日 Item 別稼働 top \$\{summary\.top\.length\} 件 \(合計時間が多い順\)`\}/.test(
      tic,
    )
  ) {
    findings.push({ level: 'info', message: `iter724 invariant: top-items ol 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter724 invariant: 破壊` })
  }

  // 4. iter720 invariant: cycle-check status 維持
  const ccs = readFileSync(
    resolve(process.cwd(), 'src/components/pdca/cycle-check-stats-card.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`ステータス分布 \(完了 \$\{stats\.done\} 件 \/ 未完了 \$\{stats\.inProgressOrTodo\} 件 \/ cancelled \$\{stats\.cancelled\} 件\)`\}/.test(
      ccs,
    )
  ) {
    findings.push({ level: 'info', message: `iter720 invariant: cycle-check status 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter720 invariant: 破壊` })
  }

  // 5. iter716 invariant: pdca stats grid 維持
  const pdca = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/pdca-panel.tsx'),
    'utf8',
  )
  if (/aria-label="PDCA 4 段階の集計 \(Plan \/ Do \/ Check \/ Act\)"/.test(pdca)) {
    findings.push({ level: 'info', message: `iter716 invariant: pdca stats grid 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter716 invariant: 破壊` })
  }

  console.log(`\n=== Findings (today-keyboard-hint-iter726) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
