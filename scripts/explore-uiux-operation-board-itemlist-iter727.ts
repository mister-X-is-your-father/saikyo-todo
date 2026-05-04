/**
 * Phase 6.15 loop iter 727 (mode-D Desktop a11y) —
 * operation-board-widget の ItemList が render する `<ul>` に件数込み
 * aria-label を持たせ、SR の list shortcut で section と解離した時に
 * label が消えるのを防ぐ (iter720-725 と同 pattern)。
 *
 * 課題: operation-board-widget.tsx 行 343 の `<ul className="space-y-0.5">` は
 *   aria-label 無しで、Section 親の role="group" + aria-labelledby だけに依存。
 *   SR の "L" shortcut で list 直行された時に「何の list か」が消える。
 *
 * fix (1 ファイル ~25 行差分):
 *   - ItemList に optional `ariaLabel` prop 追加 → ul の aria-label に bind
 *   - 4 callers (overdue / mustToday / todayScheduled / doneYesterday) に
 *     件数込みの動的 aria-label を渡す
 *
 * 検証: source-side regex assert + iter701-726 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const op = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )

  // 1. ItemList が ariaLabel prop を受け取り ul に bind
  const hasIter727Comment = /iter727: Section 親は role="group" \+ aria-labelledby を持つが/.test(
    op,
  )
  const hasAriaLabelProp = /ariaLabel\?: string/.test(op)
  const ulHasAriaLabel = /<ul className="space-y-0\.5" aria-label=\{ariaLabel\}>/.test(op)
  if (hasIter727Comment && hasAriaLabelProp && ulHasAriaLabel) {
    findings.push({ level: 'info', message: `ItemList ariaLabel prop + ul bind OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `ItemList ariaLabel 不完全 (comment=${hasIter727Comment} prop=${hasAriaLabelProp} bind=${ulHasAriaLabel})`,
    })
  }

  // 2. 4 callers が動的 aria-label を渡している
  const callerRules: Array<{ name: string; regex: RegExp }> = [
    {
      name: 'overdue',
      regex:
        /ariaLabel=\{`期限超過 \$\{board\.overdue\.total\} 件のうち上位 \$\{board\.overdue\.top3\.length\} 件 \(期日が古い順\)`\}/,
    },
    {
      name: 'mustToday',
      regex: /ariaLabel=\{`今日の MUST \$\{board\.mustToday\.count\} 件 \(期日が近い順\)`\}/,
    },
    {
      name: 'todayScheduled',
      regex: /ariaLabel=\{`今日の予定 \$\{board\.todayScheduled\.count\} 件 \(時刻順\)`\}/,
    },
    {
      name: 'doneYesterday',
      regex: /ariaLabel=\{`昨日 done \$\{board\.doneYesterday\.count\} 件`\}/,
    },
  ]
  for (const c of callerRules) {
    if (c.regex.test(op)) {
      findings.push({ level: 'info', message: `caller ${c.name} ariaLabel OK` })
    } else {
      findings.push({ level: 'warning', message: `caller ${c.name} ariaLabel 欠落` })
    }
  }

  // 3. iter726 invariant: today-view 静的キーボードヒント aria-live なし維持
  const tv = readFileSync(resolve(process.cwd(), 'src/components/workspace/today-view.tsx'), 'utf8')
  if (
    /iter726: 静的キーボードヒントは aria-live="polite" の誤用/.test(tv) &&
    /<p className="text-muted-foreground text-xs">\s*\n\s*キーボード: j\/k で移動/.test(tv)
  ) {
    findings.push({ level: 'info', message: `iter726 invariant: today-view aria-live 削除維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter726 invariant: 破壊` })
  }

  // 4. iter725 invariant: calendar nav group 維持
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

  // 5. iter720 invariant: cycle-check status 維持
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

  console.log(`\n=== Findings (operation-board-itemlist-iter727) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
