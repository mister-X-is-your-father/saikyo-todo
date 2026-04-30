/**
 * Phase 6.15 loop iter 481 (mode-D Desktop a11y) —
 * SprintRiskBoardWidget の「担当者負荷」 table に caption + th scope="col" を追加、codify。
 *
 * 課題: src/components/sprint/sprint-risk-board-widget.tsx 行 151-184 の
 *   `<table aria-labelledby="sprint-risk-load-heading">` には:
 *   1. `<caption>` 不在 — SR が table list 内 navigate しても列構成 (担当 / 件数 / MUST / 負荷)
 *      の context が aria-labelledby (見出し 1 文字列) のみ、各列の役割は読み上げ前は不明
 *   2. 4 個の `<th>` 全てに scope 属性なし — header-cell 関連付けが implicit、SR は cell read 時に
 *      列 header を確実に announce しない場合あり (WCAG 1.3.1 Info and Relationships)
 *
 * fix (1 ファイル ~12 行差分):
 *   - `<caption className="sr-only">` で table 構成 (担当者数 + 4 列の名称) を SR 用に追加
 *     (visual には影響なし)
 *   - 4 個の `<th>` 全てに `scope="col"` 追加
 *
 * iter380 (mock-entries-table) で確立した pattern の sprint widget 系列への水平展開。
 * 機能追加なし、shadcn 編集なし。
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

  const path = 'src/components/sprint/sprint-risk-board-widget.tsx'
  const src = readFileSync(resolve(process.cwd(), path), 'utf8')

  // 1. caption className="sr-only" で SR 用 table 概要が追加されている
  if (
    /<caption\s+className="sr-only">[\s\S]{0,200}?担当者ごとの負荷一覧[\s\S]{0,200}?<\/caption>/.test(
      src,
    )
  ) {
    findings.push({ level: 'info', message: `${path}: caption sr-only OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: caption sr-only 不在` })
  }

  // 2. caption に loadEntries.length が含まれて動的件数が出る (JSX expression)
  if (/<caption\s+className="sr-only">[\s\S]{0,200}?\{loadEntries\.length\}/.test(src)) {
    findings.push({ level: 'info', message: `${path}: caption に件数 dynamic OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: caption 件数 dynamic 不在` })
  }

  // 3. 4 個の th scope="col" がいる (担当 / 件数 / MUST / 負荷)
  const thMatches = src.match(/<th\s+scope="col"\s+className="[^"]*">/g) ?? []
  if (thMatches.length === 4) {
    findings.push({ level: 'info', message: `${path}: th scope="col" 4 個 OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: th scope="col" 期待 4 個 / 実際 ${thMatches.length} 個`,
    })
  }

  // 4. 旧 scope 無し th が完全消滅 (regex で scope を持たない th が table 内に無い)
  if (!/<th\s+className="py-1 text-(left|right) font-normal">/.test(src)) {
    findings.push({ level: 'info', message: `${path}: 旧 scope 無し th が消えている OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: 旧 scope 無し th が残存` })
  }

  // 5. table の aria-labelledby="sprint-risk-load-heading" 維持 (regression)
  if (
    /<table\s+className="w-full text-xs"\s+aria-labelledby="sprint-risk-load-heading">/.test(src)
  ) {
    findings.push({ level: 'info', message: `${path}: table aria-labelledby 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: table aria-labelledby 破壊` })
  }

  // 6. 4 列の header text 維持 (担当 / 件数 / MUST / 負荷)
  const headerCols = ['担当', '件数', 'MUST', '負荷']
  let headersOk = true
  for (const h of headerCols) {
    const re = new RegExp(`<th\\s+scope="col"[^>]*>\\s*\\n?\\s*${h}\\s*\\n?\\s*</th>`)
    if (!re.test(src)) {
      headersOk = false
      findings.push({ level: 'warning', message: `${path}: th "${h}" header text 不在` })
    }
  }
  if (headersOk) {
    findings.push({ level: 'info', message: `${path}: 4 列 header text 維持 OK` })
  }

  console.log(`\n=== Findings (sprint-risk-table-iter481) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
