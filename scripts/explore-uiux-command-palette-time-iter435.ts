/**
 * Phase 6.15 loop iter 435 (mode-D Desktop a11y) — CommandPalette item 検索
 * row の dueDate 表示が `<span title=...>` (mouse hover only) で SR / キーボード
 * ユーザに ISO 日付が伝わらなかった問題を `<time dateTime>` 要素に格上げ、
 * codify。
 *
 * 課題: src/components/shared/command-palette.tsx の item row dueDate:
 *   ```tsx
 *   <span title={`期限 ${item.dueDate}`}>
 *     {formatFriendlyDate(item.dueDate, today)}
 *   </span>
 *   ```
 *   - `title=` 属性は **mouse hover only**、 keyboard / SR ユーザに届かない
 *   - visible 表示は friendly 形式 ("明日" / "4/30 (木)" / "2 日後" 等) で、
 *     ISO 日付 (2026-05-01) が見えず、非 native 日本語 SR ユーザには日付の
 *     文脈が掴めない
 *   - `<time>` 要素は HTML5 で SR が日付情報として認識する semantic な選択肢
 *
 * fix: 1 ファイル ~3 行差分。
 *   - `<span title=...>` を `<time dateTime={ISO} aria-label="期限 ${ISO}">` に格上げ
 *   - visible text (formatFriendlyDate 出力) は不変、SR は aria-label で
 *     "期限 2026-05-01" を聞き取れる
 *   - dateTime 属性で SR の date interpretation が安定
 *
 * 機能追加なし、視覚 layout / 色 / 文字サイズ 全て不変、shadcn 編集なし。
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

  const path = 'src/components/shared/command-palette.tsx'
  const src = readFileSync(resolve(process.cwd(), path), 'utf8')

  // 1. <time dateTime + aria-label="期限 ..."> 配線
  if (
    /<time[\s\S]{0,200}?dateTime=\{item\.dueDate\}[\s\S]{0,100}?aria-label=\{`期限 \$\{item\.dueDate\}`\}/.test(
      src,
    )
  ) {
    findings.push({
      level: 'info',
      message: `${path}: <time dateTime + aria-label="期限 ..."> 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: <time dateTime + aria-label> 配線 不在`,
    })
  }

  // 2. 旧 <span title="期限 ..."> 残存 detector (regression)
  if (/<span[\s\S]{0,200}?title=\{`期限 \$\{item\.dueDate\}`\}/.test(src)) {
    findings.push({
      level: 'error',
      message: `${path}: 旧 <span title="期限 ..."> 残存 (regression)`,
    })
  } else {
    findings.push({
      level: 'info',
      message: `${path}: 旧 <span title="期限 ..."> 不在 OK`,
    })
  }

  // 3. visible text {formatFriendlyDate(item.dueDate, today)} は維持
  if (/\{formatFriendlyDate\(item\.dueDate, today\)\}/.test(src)) {
    findings.push({
      level: 'info',
      message: `${path}: visible formatFriendlyDate 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: visible formatFriendlyDate 消えた (regression)`,
    })
  }

  console.log(`\n=== Findings (command-palette-time-iter435) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
