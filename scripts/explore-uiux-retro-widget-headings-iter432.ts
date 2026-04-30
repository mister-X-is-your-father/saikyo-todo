/**
 * Phase 6.15 loop iter 432 (mode-D Desktop a11y) — SprintRetroWidget の
 * sub-section 2 件 ("Status 分布" / "落ちた item の主因") を heading semantic
 * 化、codify (iter431 SprintRiskBoardWidget pattern 水平展開)。
 *
 * 課題: src/components/sprint/sprint-retro-widget.tsx
 *   - "Status 分布" header が `<div>` で heading semantic 不在
 *   - "落ちた item の主因" header も `<div>` で同問題
 *   - 各 chip 群 (`flex flex-wrap`) も role/aria-labelledby 不在で SR ユーザに
 *     「これは status 分布の chip 群」 という context が伝わらない
 *
 * fix: 1 ファイル ~12 行差分。
 *   - "Status 分布" `<div>` を `<h3 id="sprint-retro-status-heading">` に
 *     (visual サイズ text-xs 維持、heading semantic だけ追加)
 *   - chip wrapper に `role="group" aria-labelledby` 配線
 *   - "落ちた item の主因" `<div>` を `<h3 id="sprint-retro-causes-heading">` に
 *   - 4 SeverityChip wrapper に `role="group" aria-labelledby` 配線
 *
 * 機能追加なし、視覚 layout / 色 / chip 表示 全て不変、shadcn 編集なし。
 *
 * 検証: source-side regex assert で codify。runtime test (Sprint widget 描画) は
 *   workspace + sprint + items seed 必要なため省略。
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

  // 1. h3 id="sprint-retro-status-heading" + Status 分布 文言
  if (/<h3\s+id="sprint-retro-status-heading"[\s\S]{0,300}?Status 分布/.test(src)) {
    findings.push({
      level: 'info',
      message: `${path}: <h3 id="sprint-retro-status-heading"> Status 分布 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: <h3 id="sprint-retro-status-heading"> 不在`,
    })
  }

  // 2. role="group" aria-labelledby="sprint-retro-status-heading"
  if (/role="group"\s+aria-labelledby="sprint-retro-status-heading"/.test(src)) {
    findings.push({
      level: 'info',
      message: `${path}: chip wrapper role="group" + aria-labelledby (Status) OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: chip wrapper role="group" + aria-labelledby (Status) 不在`,
    })
  }

  // 3. h3 id="sprint-retro-causes-heading" + 落ちた item の主因 文言
  if (/<h3\s+id="sprint-retro-causes-heading"[\s\S]{0,300}?落ちた item の主因/.test(src)) {
    findings.push({
      level: 'info',
      message: `${path}: <h3 id="sprint-retro-causes-heading"> 主因 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: <h3 id="sprint-retro-causes-heading"> 不在`,
    })
  }

  // 4. role="group" aria-labelledby="sprint-retro-causes-heading"
  if (/role="group"\s+aria-labelledby="sprint-retro-causes-heading"/.test(src)) {
    findings.push({
      level: 'info',
      message: `${path}: chip wrapper role="group" + aria-labelledby (Causes) OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: chip wrapper role="group" + aria-labelledby (Causes) 不在`,
    })
  }

  // 5. 旧 <div className="text-muted-foreground mb-1 text-xs">Status 分布</div> 残存
  if (/<div className="text-muted-foreground mb-1 text-xs">\s*Status 分布\s*<\/div>/.test(src)) {
    findings.push({
      level: 'error',
      message: `${path}: 旧 <div> Status 分布 残存 (regression)`,
    })
  } else {
    findings.push({ level: 'info', message: `${path}: 旧 <div> Status 分布 不在 OK` })
  }

  // 6. iter431 SprintRiskBoardWidget の同 pattern が消えていないか (consistency check)
  const riskSrc = readFileSync(
    resolve(process.cwd(), 'src/components/sprint/sprint-risk-board-widget.tsx'),
    'utf8',
  )
  if (/<h3\s+id="sprint-risk-top-heading"/.test(riskSrc)) {
    findings.push({
      level: 'info',
      message: `risk-board: iter431 h3 heading pattern 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `risk-board: iter431 h3 heading pattern 消えた (regression)`,
    })
  }

  console.log(`\n=== Findings (retro-widget-headings-iter432) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
