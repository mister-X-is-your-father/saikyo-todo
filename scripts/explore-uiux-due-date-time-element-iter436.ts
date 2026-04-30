/**
 * Phase 6.15 loop iter 436 (mode-D Desktop a11y) — backlog-view + today-view
 * の dueDate 表示を `<span title>` (mouse hover only) から `<time dateTime>`
 * 要素に格上げ (iter435 command-palette と同 pattern 水平展開)、codify。
 *
 * 課題: ISO 日付の表示が view 間で format 差分:
 *   - command-palette: 旧 `<span title>` → iter435 で `<time dateTime>`
 *   - backlog-view: `<span title={v} aria-label="期限 ${v}">` (title は hover only)
 *   - today-view: 外側 `<span title={dueDate} aria-label>` + 内側 `<time dateTime>` の
 *     冗長 (`title` が outer, `time` が inner で 2 source 矛盾の risk)
 *
 *   `title=` は mouse hover only で keyboard / SR ユーザに届かない、HTML5 `<time>`
 *   要素は SR が日付として interpret するため AT 上で安定。
 *
 * fix: 2 ファイル ~6 行差分。
 *   - backlog-view: `<span title={v} aria-label>` を `<time dateTime={v}
 *     aria-label>` に格上げ (iter435 と同 pattern)
 *   - today-view: 外側 `<span title>` の `title` 属性を削除 (内側 `<time>` が単一
 *     source、aria-label は維持)
 *   - 視覚 layout / 色 / 文字サイズ 全て不変、shadcn 編集なし
 *
 * 機能追加なし、format helper (formatFriendlyDate) 既存維持。
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

  // 1. backlog-view: <time dateTime={v} aria-label="期限 ..."> 配線
  const backlogPath = 'src/components/workspace/backlog-view.tsx'
  const backlogSrc = readFileSync(resolve(process.cwd(), backlogPath), 'utf8')
  if (
    /<time dateTime=\{v\}\s+aria-label=\{`期限 \$\{v\}`\}>[\s\S]{0,100}?formatFriendlyDate\(v, today\)/.test(
      backlogSrc,
    )
  ) {
    findings.push({
      level: 'info',
      message: `${backlogPath}: <time dateTime + aria-label + formatFriendlyDate> 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${backlogPath}: <time dateTime> 配線 不在`,
    })
  }

  // 2. backlog-view: 旧 <span title={v} aria-label="期限 ..."> 残存 (regression)
  if (/<span title=\{v\}\s+aria-label=\{`期限 \$\{v\}`\}>/.test(backlogSrc)) {
    findings.push({
      level: 'error',
      message: `${backlogPath}: 旧 <span title=> 残存 (regression)`,
    })
  } else {
    findings.push({
      level: 'info',
      message: `${backlogPath}: 旧 <span title=> 不在 OK`,
    })
  }

  // 3. today-view: 外側 span の title 属性を削除
  const todayPath = 'src/components/workspace/today-view.tsx'
  const todaySrc = readFileSync(resolve(process.cwd(), todayPath), 'utf8')
  if (/title=\{it\.dueDate\}\s+aria-label/.test(todaySrc)) {
    findings.push({
      level: 'error',
      message: `${todayPath}: 旧 title={it.dueDate} 残存 (regression)`,
    })
  } else {
    findings.push({
      level: 'info',
      message: `${todayPath}: 旧 title={it.dueDate} 削除 OK`,
    })
  }

  // 4. today-view: <time dateTime={it.dueDate}> 維持 (iter261 invariant)
  if (
    /<time dateTime=\{it\.dueDate\}>[\s\S]{0,100}?formatFriendlyDate\(it\.dueDate, todayDate\)/.test(
      todaySrc,
    )
  ) {
    findings.push({
      level: 'info',
      message: `${todayPath}: <time dateTime + formatFriendlyDate> 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${todayPath}: <time dateTime + formatFriendlyDate> 消えた (regression)`,
    })
  }

  // 5. iter435 command-palette consistency
  const palettePath = 'src/components/shared/command-palette.tsx'
  const paletteSrc = readFileSync(resolve(process.cwd(), palettePath), 'utf8')
  if (/<time[\s\S]{0,200}?dateTime=\{item\.dueDate\}/.test(paletteSrc)) {
    findings.push({
      level: 'info',
      message: `command-palette: iter435 <time dateTime> 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `command-palette: iter435 <time dateTime> 消えた (regression)`,
    })
  }

  console.log(`\n=== Findings (due-date-time-element-iter436) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
