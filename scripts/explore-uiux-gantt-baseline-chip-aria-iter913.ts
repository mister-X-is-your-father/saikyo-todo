/**
 * Phase 6.15 loop iter 913 (mode-D Desktop a11y) —
 * gantt-view project summary banner の baseline chip を critical / slip 兄弟と
 * 同 pattern (title + aria-label + inner aria-hidden) に揃え、SR 経路の一貫性を獲得。
 *
 * 経緯: critical / slip chip は `title=` (mouse hover で定義) + `aria-label=` (SR で
 *   定義 + 件数) + inner span aria-hidden (visible text 二重読み防止) の三点セット
 *   既に持つ。baseline chip のみ三点全部欠落 → SR が plain "baseline N 件" のみで
 *   定義情報 (= 計画策定時に固定した開始/終了日、実績との遅延差分計測の基準) を逃す。
 *
 * 修正 (+5/-1 行、1 file):
 *   - outer span に title= (mouse hover) + aria-label= (SR 集約) 追加
 *   - inner span aria-hidden + font-mono 数値 wrap
 *   - critical / slip と完全同 pattern (SR / hover / mouse 全 modality に一貫情報)
 *
 * 検証: source-side regex assert (chip 3 兄弟 pattern 一貫性) +
 *   iter735/912 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')

  // 1. baseline chip に title 追加 OK
  if (
    /title="baseline = 計画策定時に固定した開始\/終了日 \(実績との遅延差分計測の基準\)"/.test(gv)
  ) {
    findings.push({
      level: 'info',
      message: `gantt baseline chip title 追加 OK (mouse hover 定義表示)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `gantt baseline chip title 欠落 (critical / slip 兄弟と不整合)`,
    })
  }

  // 2. baseline chip に aria-label 追加 OK
  if (
    /aria-label=\{`baseline \$\{baselineCount\} 件 \(計画策定時に固定した開始\/終了日、実績との遅延差分計測の基準\)`\}/.test(
      gv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `gantt baseline chip aria-label 追加 OK (SR で定義 + 件数 1 行集約)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `gantt baseline chip aria-label 欠落`,
    })
  }

  // 3. baseline chip inner aria-hidden 追加 OK
  if (
    /data-testid="gantt-summary-baseline"[\s\S]*?<span aria-hidden="true">\s*baseline <span className="font-mono">\{baselineCount\}<\/span> 件\s*<\/span>/.test(
      gv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `gantt baseline chip inner aria-hidden 追加 OK (二重読み防止)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `gantt baseline chip inner aria-hidden 欠落`,
    })
  }

  // 4. critical chip pattern 維持 (兄弟 invariant)
  if (
    /aria-label=\{`critical path \$\{criticalCount\} 件 \(project 全体期間に直接影響、遅延すると全体遅延\)`\}/.test(
      gv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `gantt critical chip aria-label 兄弟 invariant 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `gantt critical chip 兄弟 invariant 破壊` })
  }

  // 5. slip chip pattern 維持 (兄弟 invariant)
  if (
    /aria-label=\{`遅延 \$\{slipItemCount\} 件 \(baseline より遅れている item\)、計 \$\{totalSlipDays\} 日`\}/.test(
      gv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `gantt slip chip aria-label 兄弟 invariant 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `gantt slip chip 兄弟 invariant 破壊` })
  }

  // iter912 invariant: sprints-panel ideal line aria-label 死コード除去
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (/aria-label=\{`理想ライン \$\{elapsedPct\}%`\}/.test(sp)) {
    findings.push({
      level: 'warning',
      message: `iter912 invariant: sprints-panel ideal-line aria-label 死コード再生`,
    })
  } else {
    findings.push({
      level: 'info',
      message: `iter912 invariant: sprints-panel ideal-line aria-label 死コード除去 維持 OK`,
    })
  }

  // iter735 invariant
  const tce = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  const tceMatches = tce.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tceMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter735 invariant: team-context-editor aria-keyshortcuts 維持 OK (${tceMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant: 破壊` })
  }

  console.log(`\n=== Findings (gantt-baseline-chip-aria-iter913) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
