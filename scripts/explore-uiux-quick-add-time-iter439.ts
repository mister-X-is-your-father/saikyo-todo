/**
 * Phase 6.15 loop iter 439 (mode-D Desktop a11y) — QuickAdd preview chip の
 * scheduledFor が `<span title>` (mouse hover only) で SR / keyboard ユーザに
 * ISO 日付が不可達だった問題を `<time dateTime>` 要素に格上げ (iter435 /
 * iter436 / iter437 / iter438 と同 pattern 5 view 目水平展開)。
 *
 * 課題: src/components/workspace/quick-add.tsx の preview chip:
 *   ```tsx
 *   <span
 *     title={preview.scheduledFor}
 *     aria-label={`予定 ${ISO}${dueTime}`}
 *   >
 *     {formatFriendlyDate(...)}
 *   </span>
 *   ```
 *   `title=` 属性は **mouse hover only**。aria-label が SR にはあるが、
 *   `<span>` 自体は date semantic を持たない。
 *
 * fix: 1 ファイル ~5 行差分 (コメント込み)。
 *   - `<span>` を `<time dateTime={preview.scheduledFor} aria-label="予定 ${ISO} ${dueTime}">`
 *     に格上げ (HTML5 time semantic)
 *   - className / visible text (formatFriendlyDate + dueTime) は完全維持
 *   - title 属性削除 (aria-label が単一 source、mouse hover はブラウザ default
 *     date hint で十分)
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

  const path = 'src/components/workspace/quick-add.tsx'
  const src = readFileSync(resolve(process.cwd(), path), 'utf8')

  // 1. <time dateTime + aria-label="予定 ..."> 配線
  if (
    /<time[\s\S]{0,200}?dateTime=\{preview\.scheduledFor\}[\s\S]{0,200}?aria-label=\{`予定 \$\{preview\.scheduledFor\}/.test(
      src,
    )
  ) {
    findings.push({
      level: 'info',
      message: `${path}: <time dateTime + aria-label="予定 ..."> 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: <time dateTime> 配線 不在`,
    })
  }

  // 2. 旧 <span title=preview.scheduledFor> 残存 (regression)
  if (/<span[\s\S]{0,200}?title=\{preview\.scheduledFor\}/.test(src)) {
    findings.push({
      level: 'error',
      message: `${path}: 旧 <span title={preview.scheduledFor}> 残存 (regression)`,
    })
  } else {
    findings.push({
      level: 'info',
      message: `${path}: 旧 <span title> 不在 OK`,
    })
  }

  // 3. visible {formatFriendlyDate(preview.scheduledFor, new Date())} 維持
  if (/\{formatFriendlyDate\(preview\.scheduledFor, new Date\(\)\)\}/.test(src)) {
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

  // 4. iter435 / iter436 / iter437 consistency check (4 view 維持)
  const PATTERNS: { path: string; label: string; regex: RegExp }[] = [
    {
      path: 'src/components/shared/command-palette.tsx',
      label: 'command-palette',
      regex: /<time[\s\S]{0,200}?dateTime=\{item\.dueDate\}/,
    },
    {
      path: 'src/components/workspace/backlog-view.tsx',
      label: 'backlog-view',
      regex: /<time dateTime=\{v\}/,
    },
    {
      path: 'src/components/workspace/today-view.tsx',
      label: 'today-view',
      regex: /<time dateTime=\{it\.dueDate\}>/,
    },
    {
      path: 'src/components/workspace/personal-period-view.tsx',
      label: 'personal-period-view',
      regex: /<time[\s\S]{0,200}?dateTime=\{it\.dueDate\}/,
    },
  ]
  for (const p of PATTERNS) {
    const s = readFileSync(resolve(process.cwd(), p.path), 'utf8')
    if (p.regex.test(s)) {
      findings.push({ level: 'info', message: `${p.label}: <time dateTime> 維持 OK` })
    } else {
      findings.push({
        level: 'warning',
        message: `${p.label}: <time dateTime> 消えた (regression)`,
      })
    }
  }

  console.log(`\n=== Findings (quick-add-time-iter439) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
