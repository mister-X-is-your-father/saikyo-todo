/**
 * Phase 6.15 loop iter 433 (mode-D Desktop a11y) — OperationBoardWidget の
 * `Section` component を heading semantic 化 (widget heading 統一 連続 6 件目)、
 * codify。
 *
 * 課題: src/components/workspace/operation-board-widget.tsx の Section コンポは
 *   ```tsx
 *   <div className="space-y-1">
 *     <div className="flex items-center gap-1.5 text-xs font-medium ...">
 *       {icon}
 *       <span>{label}</span>
 *       {count !== undefined ? <span>({count})</span> : null}
 *     </div>
 *     <div className="pl-5">{children}</div>
 *   </div>
 *   ```
 *   今日の作戦盤 widget は 4-5 sub-section (推奨第 1 タスク / 期限超過 / 今日の
 *   MUST / 今日の予定 / 昨日 done) を持つが、Section header が `<div>` で
 *   heading semantic 不在 → SR ユーザは widget 内の sub-section に heading
 *   shortcut で直行不可。
 *
 * fix: 1 ファイル ~10 行差分 (iter427 / iter428 / iter430 / iter431 / iter432 と
 *   連続 widget heading 統一 6 件目)。
 *   - 内側 `<div>` (label container) を `<h3 id>` に降格
 *   - id は label を normalize (`[^a-zA-Z0-9]` → `-`) して unique 化
 *   - 外側 `<div>` (section wrapper) に `role="group" aria-labelledby` 配線
 *   - count `<span>` を font-normal にして heading 文字列の太さ差分を出す
 *     (visual layout は不変、font-weight 微調整のみ)
 *
 * 機能追加なし、視覚 layout / 色 / icon / pl-5 indent 全て不変、shadcn 編集なし。
 *
 * 検証: source-side regex assert で codify。runtime test (Today widget 描画) は
 *   workspace + item seed 必要なため省略。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const path = 'src/components/workspace/operation-board-widget.tsx'
  const src = readFileSync(resolve(process.cwd(), path), 'utf8')

  // 1. h3 id={headingId} + className flex items-center
  if (
    /<h3\s+id=\{headingId\}\s+className=\{`flex items-center gap-1\.5 text-xs font-medium \$\{labelTone\}`\}/.test(
      src,
    )
  ) {
    findings.push({ level: 'info', message: `${path}: <h3 id={headingId}> + className OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: <h3 id={headingId}> 不在` })
  }

  // 2. headingId 計算 (label を normalize)
  if (
    /const headingId = `operation-section-\$\{label\.replace\(\/\[\^a-zA-Z0-9\]\/g, '-'\)\}`/.test(
      src,
    )
  ) {
    findings.push({ level: 'info', message: `${path}: headingId 計算 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: headingId 計算 不在` })
  }

  // 3. wrapper div role="group" aria-labelledby
  if (/<div className="space-y-1" role="group" aria-labelledby=\{headingId\}>/.test(src)) {
    findings.push({
      level: 'info',
      message: `${path}: wrapper div role="group" + aria-labelledby OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: wrapper div role="group" + aria-labelledby 不在`,
    })
  }

  // 4. count span が font-normal (heading 太さ差分)
  if (/<span className="text-muted-foreground font-normal tabular-nums">/.test(src)) {
    findings.push({ level: 'info', message: `${path}: count span font-normal OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: count span font-normal 不在` })
  }

  // 5. 旧 inner <div className="flex items-center ..."> 構造の残存検出 (regression)
  if (
    /<div className=\{`flex items-center gap-1\.5 text-xs font-medium \$\{labelTone\}`\}>/.test(src)
  ) {
    findings.push({
      level: 'error',
      message: `${path}: 旧 inner <div> heading 残存 (regression)`,
    })
  } else {
    findings.push({ level: 'info', message: `${path}: 旧 inner <div> 不在 OK` })
  }

  console.log(`\n=== Findings (operation-board-section-heading-iter433) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
