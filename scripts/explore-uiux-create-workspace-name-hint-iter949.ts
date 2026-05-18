/**
 * Phase 6.15 loop iter 949 (mode-D Desktop a11y) — create-workspace-form の name field に
 * form hint pattern (iter735-741 sweep) を適用。隣接 slug 側 (ws-slug-hint) と同
 * a11y structure に揃え、name の 50 文字上限と用途を提示。
 *
 * 課題: create-workspace-form は slug 側に `ws-slug-hint` が iter341/342 頃 から既存だが、
 *   name field 側は hint なし (placeholder "例: チーム A" + Label のみ)。
 *   iter735 displayName-hint / iter736 signup-email-hint / iter737 login-email-hint /
 *   iter738 tsEmail-hint / iter739 tsHours-hint / iter740 tsDescription-hint / iter741
 *   login-password-hint が確立した「pattern エラー前に format hint を出す」 a11y sweep
 *   pattern と不整合。
 *
 * fix: create-workspace-form の name field に
 *   `<p id="ws-name-hint" className="text-muted-foreground text-xs">チームメンバーに
 *   表示される Workspace 名。最大 50 文字。例: チーム A</p>` を追加 + name input の
 *   aria-describedby を `'ws-name-hint'` (no error) / `'ws-name-hint ws-name-error'`
 *   (error 時) に更新。SR は input focus 時に hint も読む。+8/-3 行 (1 file)。視覚も
 *   slug-hint と同じ位置 + style で表示、user は max length と例を pre-emptively 認知可能。
 *
 * 機能追加なし、shadcn 編集なし、影響面 1 ファイル。
 *
 * 検証: source-side regex で codify。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const target = 'src/components/workspace/create-workspace-form.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  // 1. ws-name-hint <p> 要素
  if (!/<p id="ws-name-hint"/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: ws-name-hint <p> 不在`,
    })
  } else {
    findings.push({ level: 'info', message: `ws-name-hint <p> OK` })
  }

  // 2. ws-name-hint visible text
  if (!/チームメンバーに表示される Workspace 名/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: ws-name-hint visible text 不在`,
    })
  } else {
    findings.push({ level: 'info', message: `ws-name-hint visible text OK` })
  }

  // 3. name input aria-describedby が hint と error の組み合わせを参照
  if (!/'ws-name-hint ws-name-error'\s*:\s*'ws-name-hint'/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: name input aria-describedby に hint id 不在`,
    })
  } else {
    findings.push({ level: 'info', message: `name input aria-describedby hint id OK` })
  }

  // 4. ws-slug-hint invariant 維持 (隣接 field の pattern)
  if (!/<p id="ws-slug-hint"/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: ws-slug-hint 既存 invariant 破壊`,
    })
  } else {
    findings.push({ level: 'info', message: `ws-slug-hint 維持 OK` })
  }

  // 5. iter948 invariant: app/page.tsx HomePage main tabIndex={-1}
  const homeSrc = readFileSync(resolve(process.cwd(), 'src/app/page.tsx'), 'utf8')
  if (
    !/tabIndex=\{-1\}[\s\S]*?id="main-content"|id="main-content"[\s\S]*?tabIndex=\{-1\}/.test(
      homeSrc,
    )
  ) {
    findings.push({ level: 'warning', message: `iter948 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter948 invariant OK` })
  }

  // 6. iter947 invariant: mock-timesheet/new aria-label
  const newSrc = readFileSync(resolve(process.cwd(), 'src/app/mock-timesheet/new/page.tsx'), 'utf8')
  if (!/aria-label="Mock Timesheet 新規送信"/.test(newSrc)) {
    findings.push({ level: 'warning', message: `iter947 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter947 invariant OK` })
  }

  // 7. iter946 invariant: mock-timesheet/entries
  const entriesSrc = readFileSync(
    resolve(process.cwd(), 'src/app/mock-timesheet/entries/page.tsx'),
    'utf8',
  )
  if (!/aria-labelledby="mock-entries-heading"/.test(entriesSrc)) {
    findings.push({ level: 'warning', message: `iter946 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter946 invariant OK` })
  }

  // 8. iter735 invariant
  const tce = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  const tceMatches = tce.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tceMatches.length >= 2) {
    findings.push({ level: 'info', message: `iter735 invariant OK (${tceMatches.length} 箇所)` })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant 破壊` })
  }

  console.log(`\n=== Findings (create-workspace-name-hint-iter949) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
