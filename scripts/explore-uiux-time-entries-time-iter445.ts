/**
 * Phase 6.15 loop iter 445 (mode-D Desktop a11y) — TimeEntriesTable workDate
 * column を raw ISO `<td>` → `<time dateTime>` 要素に格上げ (iter435 / iter436 /
 * iter437 / iter439 と同 pattern 6 view 目水平展開)、codify。
 *
 * 課題: src/components/time-entry/time-entries-table.tsx の row workDate cell:
 *   ```tsx
 *   <td className="py-2">{e.workDate}</td>
 *   ```
 *   raw ISO (例: "2026-04-30") を `<td>` 内で plain text として表示。SR は
 *   plain text と読み上げるが date semantic としては interpret しない。`<time>`
 *   要素は HTML5 で SR が日付情報として認識する semantic な選択肢。
 *
 * fix: 1 ファイル ~5 行差分 (コメント込み)。
 *   - `<td>` 直下の text node を `<time dateTime={e.workDate}>{e.workDate}</time>`
 *     に格上げ
 *   - className / visible text 完全維持、shadcn 編集なし
 *
 * 機能追加なし、視覚 layout / 文字サイズ 全て不変。
 *
 * 検証: source-side regex assert + 5 既存 view consistency check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const path = 'src/components/time-entry/time-entries-table.tsx'
  const src = readFileSync(resolve(process.cwd(), path), 'utf8')

  // 1. <time dateTime={e.workDate}>{e.workDate}</time> 配線
  if (/<time dateTime=\{e\.workDate\}>\s*\{e\.workDate\}\s*<\/time>/.test(src)) {
    findings.push({
      level: 'info',
      message: `${path}: <time dateTime + visible workDate> 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: <time dateTime workDate> 配線 不在`,
    })
  }

  // 2. 旧 plain text {e.workDate} 残存 detector (`<td className="py-2">{e.workDate}</td>` 形式)
  if (/<td className="py-2">\{e\.workDate\}<\/td>/.test(src)) {
    findings.push({
      level: 'error',
      message: `${path}: 旧 plain td>{e.workDate}</td> 残存 (regression)`,
    })
  } else {
    findings.push({
      level: 'info',
      message: `${path}: 旧 plain td>{e.workDate}</td> 不在 OK`,
    })
  }

  // 3. 5 既存 view consistency
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
    {
      path: 'src/components/workspace/quick-add.tsx',
      label: 'quick-add',
      regex: /<time[\s\S]{0,200}?dateTime=\{preview\.scheduledFor\}/,
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

  console.log(`\n=== Findings (time-entries-time-iter445) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
