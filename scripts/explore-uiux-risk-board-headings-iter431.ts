/**
 * Phase 6.15 loop iter 431 (mode-D Desktop a11y) — SprintRiskBoardWidget
 * (iter529 で着地、Sprint Risk Board widget UI) の section header 2 件と
 * table aria 属性を heading semantic に整える、codify。
 *
 * 課題: src/components/sprint/sprint-risk-board-widget.tsx
 *   1. "要警戒 上位 N 件" header が `<div>` で heading semantic 不在 → SR ユーザは
 *      heading shortcut で widget 内 section に直行不可
 *   2. "担当者負荷 (N 名)" header も `<div>` で同問題
 *   3. `<ul>` topRisk list が aria-label/aria-labelledby 不在 → SR で「list N 件」
 *      が伝わらず list nav が貧弱
 *   4. `<table role="table" aria-label="Sprint 担当者負荷">` は aria-label 重複 (table
 *      は implicit role="table"、別 heading に紐付ける aria-labelledby が WAI-ARIA
 *      ベストプラクティス)
 *
 * fix: 1 ファイル ~10 行差分。
 *   - "要警戒 上位 N 件" `<div>` を `<h3 id="sprint-risk-top-heading">` に
 *     (visual サイズ text-xs 維持、heading semantic だけ追加)
 *   - 同 ul に `aria-labelledby="sprint-risk-top-heading"` 配線
 *   - "担当者負荷 (N 名)" `<div>` を `<h3 id="sprint-risk-load-heading">` に
 *     (icon + text 内包、flex-items-center 維持)
 *   - 同 table に `aria-labelledby="sprint-risk-load-heading"` 配線、role="table"
 *     重複 + 旧 aria-label 削除
 *
 * 機能追加なし、視覚 layout 不変、shadcn 編集なし。
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

  const path = 'src/components/sprint/sprint-risk-board-widget.tsx'
  const src = readFileSync(resolve(process.cwd(), path), 'utf8')

  // 1. h3 id="sprint-risk-top-heading" + 要警戒 文言
  if (/<h3\s+id="sprint-risk-top-heading"[\s\S]{0,200}?要警戒 上位/.test(src)) {
    findings.push({
      level: 'info',
      message: `${path}: <h3 id="sprint-risk-top-heading"> 要警戒 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `${path}: <h3 id="sprint-risk-top-heading"> 不在` })
  }

  // 2. ul aria-labelledby="sprint-risk-top-heading"
  if (/<ul[^>]*aria-labelledby="sprint-risk-top-heading"/.test(src)) {
    findings.push({ level: 'info', message: `${path}: ul aria-labelledby 配線 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: ul aria-labelledby 配線 不在` })
  }

  // 3. h3 id="sprint-risk-load-heading" + 担当者負荷 文言
  if (/<h3\s+id="sprint-risk-load-heading"[\s\S]{0,300}?担当者負荷/.test(src)) {
    findings.push({
      level: 'info',
      message: `${path}: <h3 id="sprint-risk-load-heading"> 担当者負荷 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `${path}: <h3 id="sprint-risk-load-heading"> 不在` })
  }

  // 4. table aria-labelledby="sprint-risk-load-heading" (旧 role="table" + aria-label 削除)
  if (
    /<table[^>]*aria-labelledby="sprint-risk-load-heading"/.test(src) &&
    !/aria-label="Sprint 担当者負荷"/.test(src)
  ) {
    findings.push({
      level: 'info',
      message: `${path}: table aria-labelledby 配線 + 旧 aria-label 削除 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: table aria-labelledby 不在 or 旧 aria-label 残存`,
    })
  }

  // 5. 旧 <div> セクション header 残存していないか (regression)
  if (/<div className="text-muted-foreground mb-1 text-xs">\s*要警戒 上位/.test(src)) {
    findings.push({
      level: 'error',
      message: `${path}: 旧 <div> 要警戒 残存 (regression)`,
    })
  } else {
    findings.push({ level: 'info', message: `${path}: 旧 <div> 要警戒 不在 OK` })
  }

  console.log(`\n=== Findings (risk-board-headings-iter431) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
