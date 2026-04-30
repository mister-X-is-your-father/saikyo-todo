/**
 * Phase 6.15 loop iter 437 (mode-D Desktop a11y) — PersonalPeriodView
 * (Daily/Weekly/Monthly view) の dueDate 表示を `<span>raw ISO</span>` から
 * `<time dateTime>` 要素に格上げ (iter435 / iter436 と同 pattern 連続水平展開、
 * 4 view 目)。
 *
 * 課題: src/components/workspace/personal-period-view.tsx の row dueDate:
 *   ```tsx
 *   <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
 *     {it.dueDate}
 *   </span>
 *   ```
 *   raw ISO (例: "2026-04-30") を `<span>` でそのまま表示。SR は plain text と
 *   して読み上げるが date semantic としては interpret しない。aria-label も無し。
 *
 * fix: 1 ファイル ~7 行差分 (コメント込み)。
 *   - `<span>` を `<time dateTime={it.dueDate} aria-label="期限 ${ISO}">` に格上げ
 *   - className (text-muted-foreground / shrink-0 / text-xs / tabular-nums) は
 *     維持
 *   - visible text (raw ISO) は不変、SR は aria-label で「期限 2026-04-30」を
 *     聞き取れる
 *
 * 機能追加なし、視覚 layout / 色 / 文字サイズ 全て不変、shadcn 編集なし。
 *
 * 検証: source-side regex assert + iter435 / iter436 / iter261 (today-view) の
 *   <time dateTime> pattern が他 view で消えていないか consistency check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const path = 'src/components/workspace/personal-period-view.tsx'
  const src = readFileSync(resolve(process.cwd(), path), 'utf8')

  // 1. <time dateTime + aria-label 配線
  if (
    /<time[\s\S]{0,200}?dateTime=\{it\.dueDate\}[\s\S]{0,200}?aria-label=\{`期限 \$\{it\.dueDate\}`\}/.test(
      src,
    )
  ) {
    findings.push({
      level: 'info',
      message: `${path}: <time dateTime + aria-label> 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: <time dateTime + aria-label> 配線 不在`,
    })
  }

  // 2. 旧 <span>{it.dueDate}</span> 残存 detector (regression)
  if (
    /<span\s+className="text-muted-foreground shrink-0 text-xs tabular-nums">\s*\{it\.dueDate\}/.test(
      src,
    )
  ) {
    findings.push({
      level: 'error',
      message: `${path}: 旧 <span>{it.dueDate}</span> 残存 (regression)`,
    })
  } else {
    findings.push({
      level: 'info',
      message: `${path}: 旧 <span>{it.dueDate}</span> 不在 OK`,
    })
  }

  // 3. iter435 / iter436 / iter261 の <time> pattern 維持 (consistency)
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

  console.log(`\n=== Findings (personal-period-time-iter437) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
