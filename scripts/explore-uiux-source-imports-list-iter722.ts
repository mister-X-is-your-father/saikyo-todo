/**
 * Phase 6.15 loop iter 722 (mode-D Desktop a11y) —
 * integrations-panel SourceImportHistory ul の aria-label を件数 + 順序情報に拡張
 * (iter697-700 / iter717-721 list aria-label sweep の続き)。
 *
 * 課題: integrations-panel.tsx 行 583 の `<ul aria-label="直近の Pull 履歴 (最新 5 件)">` は
 *   静的に "最新 5 件" と書いているが実際の `imports.length` と必ず一致しない。
 *   2 件しか履歴がない時も "最新 5 件" と読み上げて誤情報になる。
 *
 * fix (1 ファイル ~3 行差分):
 *   - aria-label を `直近の Pull 履歴 ${imports.length} 件 (最新順)` に
 *
 * 検証: source-side regex assert + iter701-721 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )

  // 1. source-imports ul aria-label 動的化
  if (/aria-label=\{`直近の Pull 履歴 \$\{imports\.length\} 件 \(最新順\)`\}/.test(ip)) {
    findings.push({ level: 'info', message: `source-imports ul aria-label 動的化 OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `source-imports ul aria-label 動的化 なし`,
    })
  }

  // 2. iter721 invariant: cycle-check leadtime dl 維持
  const ccs = readFileSync(
    resolve(process.cwd(), 'src/components/pdca/cycle-check-stats-card.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`Lead time 統計 \(平均 \$\{stats\.leadTimeAvgHours\}h \/ 中央 \$\{stats\.leadTimeMedianHours \?\? '不明'\}h \/ 期間 \$\{stats\.cycleDurationDays\}d\)`\}/.test(
      ccs,
    )
  ) {
    findings.push({ level: 'info', message: `iter721 invariant: cycle-check leadtime 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter721 invariant: 破壊` })
  }

  // 3. iter720 invariant: cycle-check status 維持
  if (
    /aria-label=\{`ステータス分布 \(完了 \$\{stats\.done\} 件 \/ 未完了 \$\{stats\.inProgressOrTodo\} 件 \/ cancelled \$\{stats\.cancelled\} 件\)`\}/.test(
      ccs,
    )
  ) {
    findings.push({ level: 'info', message: `iter720 invariant: cycle-check status 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter720 invariant: 破壊` })
  }

  // 4. iter719 invariant: sprint-retro dl 維持
  const srw = readFileSync(
    resolve(process.cwd(), 'src/components/sprint/sprint-retro-widget.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`計画 vs 納品 \(計画 \$\{planned\} 件 \/ 納品 \$\{delivered\} 件 \/ 差分 \$\{delta > 0 \? '\+' : ''\}\$\{delta\} 件\)`\}/.test(
      srw,
    )
  ) {
    findings.push({ level: 'info', message: `iter719 invariant: sprint-retro dl 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter719 invariant: 破壊` })
  }

  // 5. iter710 invariant: integrations source-card actions 維持
  if (
    /aria-label=\{`Source「\$\{src\.name\}」の操作 \(pull \/ 編集 \/ 有効化切替 \/ 削除\)`\}/.test(
      ip,
    )
  ) {
    findings.push({ level: 'info', message: `iter710 invariant: integrations source-card 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter710 invariant: 破壊` })
  }

  console.log(`\n=== Findings (source-imports-list-iter722) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
