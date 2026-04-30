/**
 * Phase 6.15 loop iter 488 (mode-D Desktop a11y) —
 * BudgetPanel progressbar に aria-valuetext + data-testid + data-budget-state 追加、codify。
 *
 * 課題: src/components/workspace/budget-panel.tsx 行 156-178 の progressbar が
 *   aria-label / aria-valuenow / aria-valuemin / aria-valuemax のみで `aria-valuetext` 漏れ。
 *
 * 兄弟 progressbar との不整合 (iter424 / iter454 で確立した「aria-valuetext + severity 文字」 pattern):
 *   - sprint-retro-widget.tsx 行 98: `aria-valuetext={`${rate}% (${severityLabelJa(sev)})`}` ✓
 *   - cycle-check-stats-card.tsx 行 89: `aria-valuetext={`${rate}% (${severityLabelJa(sev)})`}` ✓
 *   - goals-panel.tsx 行 396: `aria-valuetext={`${pct}%${health ? ' — ' + health.label : ''}`}` ✓
 *   - sprints-panel.tsx 行 511: `aria-valuetext={`${done}/${total} (${pct}%) — ${tone}`}` ✓
 *   - budget-panel.tsx 行 156-178: 漏れ ✗
 *
 *   SR は aria-valuetext がない場合、aria-valuenow の数値のみ "70 percent" と読む。
 *   aria-valuetext があれば「70% — 警告」のような human-readable な状態文字を読める
 *   (iter424 PDCA / iter454 cycle-check pattern)。
 *
 * fix (1 ファイル ~3 行追加):
 *   - `aria-valuetext={`${ratioPct}% — ${s.exceeded ? '上限到達' : s.warnTriggered ? '警告' : '正常'}`}`
 *   - `data-testid="budget-progress"` (Playwright runtime test 識別)
 *   - `data-budget-state={s.exceeded ? 'exceeded' : s.warnTriggered ? 'warn' : 'normal'}` (CSS / E2E hook)
 *
 * 機能追加なし、shadcn 編集なし。
 *
 * 検証: source-side regex assert + 兄弟 progressbar (4 件) aria-valuetext 整合性 cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const path = 'src/components/workspace/budget-panel.tsx'
  const src = readFileSync(resolve(process.cwd(), path), 'utf8')

  // 1. progressbar に aria-valuetext 配線
  if (
    /aria-valuetext=\{`\$\{ratioPct\}% — \$\{s\.exceeded \? '上限到達' : s\.warnTriggered \? '警告' : '正常'\}`\}/.test(
      src,
    )
  ) {
    findings.push({ level: 'info', message: `${path}: progressbar aria-valuetext OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: progressbar aria-valuetext 不在` })
  }

  // 2. data-testid="budget-progress" 配線
  if (/data-testid="budget-progress"/.test(src)) {
    findings.push({ level: 'info', message: `${path}: data-testid="budget-progress" OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: data-testid="budget-progress" 不在` })
  }

  // 3. data-budget-state 配線
  if (
    /data-budget-state=\{s\.exceeded \? 'exceeded' : s\.warnTriggered \? 'warn' : 'normal'\}/.test(
      src,
    )
  ) {
    findings.push({ level: 'info', message: `${path}: data-budget-state OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: data-budget-state 不在` })
  }

  // 4. progressbar の aria-label / aria-valuenow / aria-valuemin / aria-valuemax 維持 (regression)
  if (
    /role="progressbar"/.test(src) &&
    /aria-label=\{`AI 月次コスト消費率/.test(src) &&
    /aria-valuenow=\{ratioPct\}/.test(src) &&
    /aria-valuemin=\{0\}/.test(src) &&
    /aria-valuemax=\{100\}/.test(src)
  ) {
    findings.push({ level: 'info', message: `${path}: progressbar 既存 aria 属性 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: progressbar 既存 aria 属性 破壊` })
  }

  // 5. 兄弟 progressbar 整合性 cross-check (4 件)
  const sibPaths = [
    {
      path: 'src/components/sprint/sprint-retro-widget.tsx',
      name: 'sprint-retro-widget',
      pat: /aria-valuetext=\{`\$\{summary\.completionRate\}% \(\$\{completionRateSeverityLabelJa\(sev\)\}\)`\}/,
    },
    {
      path: 'src/components/pdca/cycle-check-stats-card.tsx',
      name: 'cycle-check-stats-card',
      pat: /aria-valuetext=\{`\$\{stats\.completionRate\}% \(\$\{severityLabelJa\(sev\)\}\)`\}/,
    },
    {
      path: 'src/components/workspace/goals-panel.tsx',
      name: 'goals-panel',
      pat: /aria-valuetext=\{`\$\{goalPct\}%/,
    },
    {
      path: 'src/components/workspace/sprints-panel.tsx',
      name: 'sprints-panel',
      pat: /aria-valuetext=\{`\$\{done\}\/\$\{total\}/,
    },
  ]
  for (const sib of sibPaths) {
    const sibSrc = readFileSync(resolve(process.cwd(), sib.path), 'utf8')
    if (sib.pat.test(sibSrc)) {
      findings.push({
        level: 'info',
        message: `${sib.path}: ${sib.name} progressbar aria-valuetext 維持 OK`,
      })
    } else {
      findings.push({
        level: 'warning',
        message: `${sib.path}: ${sib.name} progressbar aria-valuetext 破壊`,
      })
    }
  }

  console.log(`\n=== Findings (budget-progressbar-iter488) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
