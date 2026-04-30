/**
 * Phase 6.15 loop iter 498 (mode-D Desktop a11y) —
 * SprintRiskBoardWidget の reasons chip 群を ul/li semantic に置換、codify。
 *
 * 課題: src/components/sprint/sprint-risk-board-widget.tsx 行 122-133 の reasons chip 群:
 *   - `<div className="flex flex-wrap gap-1 pl-1.5">` で plain div、role 無し
 *   - 各 reason は `<span>` で plain text、SR は inline 連結読み上げ ("MUST due soon blocked")
 *   - context (= 何の item の reasons か) が SR に伝わらない (parent <li data-testid="risk-row-${id}">
 *     からは取れるが、reasons div は item title との関連付け weak)
 *
 *   sister chip group pattern (= sprint-risk-board-widget.tsx 行 83 で確認済 topRisk ul):
 *     `<ul aria-labelledby="sprint-risk-top-heading">` で list semantic + heading 関連付け
 *
 *   reasons は短い text label (MUST / due soon / blocked 等) なので role="img" は不適切、
 *   ul/li semantic + aria-label で「何 item の reasons か」 context を伝えるのが妥当。
 *
 * fix (1 ファイル ~5 行差分):
 *   - 旧: `<div>...<span key>{reason}</span>...</div>`
 *   - 新: `<ul role="list" aria-label="「${entry.item.title}」のリスク理由 ${count} 件" data-testid="risk-reasons-${id}">...<li key>{reason}</li>...</ul>`
 *
 * 機能不変、視覚 layout 不変 (default ul margin / list-style は flex-wrap で消える、
 * Tailwind reset で list-style:none)、shadcn 編集なし。
 *
 * 検証: source-side regex assert + iter481 invariant (caption + th scope) + 旧 div span 消滅。
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

  // 1. ul role=list + aria-label + data-testid 配線
  if (
    /<ul[\s\S]{0,200}?className="flex flex-wrap gap-1 pl-1\.5"[\s\S]{0,200}?role="list"[\s\S]{0,200}?aria-label=\{`「\$\{entry\.item\.title\}」のリスク理由 \$\{entry\.reasons\.length\} 件`\}[\s\S]{0,200}?data-testid=\{`risk-reasons-\$\{entry\.item\.id\}`\}/.test(
      src,
    )
  ) {
    findings.push({
      level: 'info',
      message: `${path}: ul role=list + aria-label + data-testid OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `${path}: ul 配線 不在` })
  }

  // 2. li で reasons map (旧 span ではない)
  if (
    /\{entry\.reasons\.map\(\(reason, i\) => \(\s*\n?\s*<li[\s\S]{0,300}?>\s*\n?\s*\{reason\}/.test(
      src,
    )
  ) {
    findings.push({ level: 'info', message: `${path}: <li> map 配線 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: <li> map 配線 不在` })
  }

  // 3. 旧 div + span が消えている
  if (
    !/<div className="flex flex-wrap gap-1 pl-1\.5">[\s\S]{0,80}?\{entry\.reasons\.map/.test(src)
  ) {
    findings.push({ level: 'info', message: `${path}: 旧 div wrapper が消えている OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: 旧 div wrapper が残存` })
  }

  // 4. iter481 invariant: caption sr-only + th scope=col 維持 (regression)
  if (
    /<caption className="sr-only">[\s\S]{0,200}?担当者ごとの負荷一覧/.test(src) &&
    (src.match(/<th\s+scope="col"\s+className="[^"]*">/g) ?? []).length === 4
  ) {
    findings.push({
      level: 'info',
      message: `${path}: iter481 invariant (caption + th scope=col) 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `${path}: iter481 invariant 破壊` })
  }

  // 5. topRisk ul の aria-labelledby 維持 (regression)
  if (/<ul className="space-y-1\.5" aria-labelledby="sprint-risk-top-heading">/.test(src)) {
    findings.push({
      level: 'info',
      message: `${path}: topRisk ul aria-labelledby 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `${path}: topRisk ul aria-labelledby 破壊` })
  }

  console.log(`\n=== Findings (risk-reasons-list-iter498) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
