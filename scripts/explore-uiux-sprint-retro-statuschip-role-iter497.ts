/**
 * Phase 6.15 loop iter 497 (mode-D Desktop a11y) —
 * SprintRetroWidget StatusChip に role="img" + aria-label + data-testid 追加、codify。
 *
 * 課題: src/components/sprint/sprint-retro-widget.tsx 行 238-264 の StatusChip:
 *   - `<span>` で role / aria-label 漏れ → SR は inline text "todo 5" のみ読み上げ
 *   - tone (ok / warn / muted) は色のみで意味伝達 (WCAG 1.4.1 違反) → SR ユーザは
 *     「完了が ok tone (緑) / blocked が warn tone (黄)」 という severity 文脈を取れない
 *   - data-testid 不在 → Playwright runtime test で identify 不可
 *
 *   sister chip pattern:
 *   - SeverityChip (severity-chip.tsx 行 79-91): role="img" + aria-label + data-testid ✓
 *   - SprintRiskBoardWidget の SeverityChip 利用箇所: ariaLabel 渡し済 ✓
 *   - PDCA cycle-check-stats-card SeverityChip: 同上 ✓
 *   - SprintRetroWidget StatusChip だけ漏れ ✗
 *
 *   iter98 PDCA bar / iter417 TaskChute priority chip で「role="img" + 集約 aria-label」
 *   pattern を確立、StatusChip もこの pattern に揃える必要がある。
 *
 * fix (1 ファイル ~10 行差分):
 *   - 旧: `<span className="...">{label}<span>{count}</span></span>`
 *   - 新: `<span role="img" aria-label="${toneLabel}: ${label} ${count} 件" data-testid="retro-status-chip-${label}"><span aria-hidden="true">{label}</span><span aria-hidden="true">{count}</span></span>`
 *   - toneLabel: 'ok'→'完了' / 'warn'→'注意' / 'muted'→'中立' / undefined→'通常'
 *
 * 機能不変、視覚 layout 不変、shadcn 編集なし。
 *
 * 検証: source-side regex assert + sister SeverityChip pattern (role="img" + aria-label) 整合性。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const path = 'src/components/sprint/sprint-retro-widget.tsx'
  const src = readFileSync(resolve(process.cwd(), path), 'utf8')

  // 1. StatusChip span に role="img" + aria-label 配線
  if (
    /<span[\s\S]{0,200}?role="img"[\s\S]{0,200}?aria-label=\{`\$\{toneLabel\}: \$\{label\} \$\{count\} 件`\}/.test(
      src,
    )
  ) {
    findings.push({ level: 'info', message: `${path}: StatusChip role="img" + aria-label OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: StatusChip role="img" + aria-label 不在` })
  }

  // 2. data-testid="retro-status-chip-${label}" 配線
  if (/data-testid=\{`retro-status-chip-\$\{label\}`\}/.test(src)) {
    findings.push({ level: 'info', message: `${path}: StatusChip data-testid OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: StatusChip data-testid 不在` })
  }

  // 3. toneLabel mapping (ok/warn/muted/default) 配線
  if (
    /tone === 'ok' \? '完了' : tone === 'warn' \? '注意' : tone === 'muted' \? '中立' : '通常'/.test(
      src,
    )
  ) {
    findings.push({ level: 'info', message: `${path}: toneLabel mapping OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: toneLabel mapping 不在` })
  }

  // 4. inner span に aria-hidden="true" 配線 (二重読み上げ防止)
  const ariaHiddenInChip = src.match(/<span aria-hidden="true">\{(?:label|count)\}<\/span>/g) ?? []
  if (ariaHiddenInChip.length >= 1) {
    findings.push({
      level: 'info',
      message: `${path}: inner span aria-hidden 配線 OK (${ariaHiddenInChip.length} 件)`,
    })
  } else {
    findings.push({ level: 'warning', message: `${path}: inner span aria-hidden 不在` })
  }

  // 5. SeverityChip (sister pattern) の role="img" + aria-label 維持確認 (regression cross-check)
  const sevPath = 'src/components/shared/severity-chip.tsx'
  const sevSrc = readFileSync(resolve(process.cwd(), sevPath), 'utf8')
  if (/role="img"[\s\S]{0,200}?aria-label=\{ariaLabel \?\? label\}/.test(sevSrc)) {
    findings.push({
      level: 'info',
      message: `${sevPath}: SeverityChip role="img" + aria-label 維持 OK (sister pattern)`,
    })
  } else {
    findings.push({ level: 'warning', message: `${sevPath}: SeverityChip role pattern 破壊` })
  }

  // 6. iter454 invariant: progressbar aria-valuetext 維持 (regression)
  if (
    /role="progressbar"[\s\S]{0,300}?aria-valuetext=\{`\$\{summary\.completionRate\}% \(\$\{completionRateSeverityLabelJa\(sev\)\}\)`\}/.test(
      src,
    )
  ) {
    findings.push({
      level: 'info',
      message: `${path}: progressbar aria-valuetext 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `${path}: progressbar aria-valuetext 破壊` })
  }

  console.log(`\n=== Findings (sprint-retro-statuschip-role-iter497) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
