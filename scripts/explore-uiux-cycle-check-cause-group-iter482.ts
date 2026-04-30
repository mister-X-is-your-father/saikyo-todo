/**
 * Phase 6.15 loop iter 482 (mode-D Desktop a11y) —
 * CycleCheckStatsCard の「遅延 / 期限超過」 cause chip group を h3 + role=group
 * で SprintRetroWidget pattern に統一、codify。
 *
 * 課題: src/components/pdca/cycle-check-stats-card.tsx 行 134-170:
 *   1. cause section の "遅延 / 期限超過" header が `<div className="text-muted-foreground mb-1 text-xs">`
 *      で plain div (heading semantic 不在) → SR の見出しナビ navigation 不可、
 *      cause chip 群と header の関連付けが visual のみ
 *   2. chip wrapper `<div className="flex flex-wrap gap-1.5">` に role=group / aria-labelledby
 *      が無く、SR は chip 群を「単発のリスト」と解釈、cause 集約の context 欠落
 *
 *   対比: SprintRetroWidget (sprint-retro-widget.tsx 行 162-216) は
 *     `<h3 id="sprint-retro-causes-heading">` + `<div role="group" aria-labelledby="sprint-retro-causes-heading">`
 *   で同 pattern を確立済。CycleCheckStatsCard は同 cause chip 構造だが pattern 漏れ。
 *
 * fix (1 ファイル ~10 行差分):
 *   - `<div>遅延 / 期限超過</div>` → `<h3 id="cycle-check-cause-heading" className="text-muted-foreground mb-1 text-xs font-normal">遅延 / 期限超過</h3>`
 *   - 旧 chip wrapper `<div className="flex flex-wrap gap-1.5">` → `<div className="flex flex-wrap gap-1.5" role="group" aria-labelledby="cycle-check-cause-heading">`
 *
 * 機能追加なし、shadcn 編集なし、視覚 layout 不変 (font-normal は default、SR semantic のみ追加)。
 *
 * 検証: source-side regex assert で codify。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const path = 'src/components/pdca/cycle-check-stats-card.tsx'
  const src = readFileSync(resolve(process.cwd(), path), 'utf8')

  // 1. h3 with id="cycle-check-cause-heading" 配線
  if (
    /<h3\s+id="cycle-check-cause-heading"[\s\S]{0,200}?>\s*\n?\s*遅延 \/ 期限超過\s*\n?\s*<\/h3>/.test(
      src,
    )
  ) {
    findings.push({ level: 'info', message: `${path}: h3 cycle-check-cause-heading OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: h3 cycle-check-cause-heading 不在` })
  }

  // 2. chip wrapper に role=group + aria-labelledby
  if (
    /<div\s+className="flex flex-wrap gap-1\.5"\s+role="group"\s+aria-labelledby="cycle-check-cause-heading"\s*>/.test(
      src,
    )
  ) {
    findings.push({
      level: 'info',
      message: `${path}: chip wrapper role=group + aria-labelledby OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: chip wrapper role=group + aria-labelledby 不在`,
    })
  }

  // 3. 旧 plain div header が消えている (heading 化済)
  if (!/<div className="text-muted-foreground mb-1 text-xs">遅延 \/ 期限超過<\/div>/.test(src)) {
    findings.push({ level: 'info', message: `${path}: 旧 plain div header が消えている OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: 旧 plain div header が残存` })
  }

  // 4. SeverityChip 3 件 (overdue / late / cancelled) 維持 (regression)
  if (
    /testId="cycle-cause-overdue"/.test(src) &&
    /testId="cycle-cause-late"/.test(src) &&
    /testId="cycle-cause-cancelled"/.test(src)
  ) {
    findings.push({ level: 'info', message: `${path}: 3 SeverityChip testId 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: SeverityChip testId 破壊` })
  }

  // 5. iter454 invariant: progressbar aria-valuetext + severity 維持
  if (
    /role="progressbar"[\s\S]{0,300}?aria-valuetext=\{`\$\{stats\.completionRate\}% \(\$\{severityLabelJa\(sev\)\}\)`\}/.test(
      src,
    )
  ) {
    findings.push({ level: 'info', message: `${path}: iter454 invariant (progressbar) 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: iter454 invariant (progressbar) 破壊` })
  }

  // 6. SprintRetroWidget pattern との整合 (id naming + role=group + aria-labelledby)
  const retroPath = 'src/components/sprint/sprint-retro-widget.tsx'
  const retroSrc = readFileSync(resolve(process.cwd(), retroPath), 'utf8')
  if (
    /<h3[\s\S]{0,200}?id="sprint-retro-causes-heading"/.test(retroSrc) &&
    /role="group"[\s\S]{0,200}?aria-labelledby="sprint-retro-causes-heading"/.test(retroSrc)
  ) {
    findings.push({
      level: 'info',
      message: `${retroPath}: SprintRetroWidget pattern (heading + group) 維持 OK (caller 統一性確認)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${retroPath}: SprintRetroWidget pattern 破壊`,
    })
  }

  console.log(`\n=== Findings (cycle-check-cause-group-iter482) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
