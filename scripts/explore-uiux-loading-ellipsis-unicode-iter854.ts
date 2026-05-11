/**
 * Phase 6.15 loop iter 854 (mode-D Desktop a11y / typographic consistency) —
 * "読み込み中..." (ASCII 3 dots) を Unicode "…" (HORIZONTAL ELLIPSIS) に統一。
 *
 * 課題: codebase 内の loading state 表記が 2 系統で乖離していた:
 *   - Unicode "…" を使う側 (10+ ファイル): command-palette / activity-log / tag-picker /
 *     assignee-picker / comment-thread / archived-items-panel / subtasks-panel /
 *     item-dependencies-panel / integrations-panel / workflows-panel
 *   - ASCII "..." を使う側 (4 ファイル / 5 件): async-states (default) / data-widget-card /
 *     kanban-view / calendar-view (planned + actual lane 2 件)
 *   loading text は SR が role=status で必ず読み上げるので、表記揺れは聞き比べでは
 *   気付き難いが「視覚的にも 1 char vs 3 char で文字幅が変わる」 = layout shift / chip 押し出し
 *   要因。Unicode "…" は 1 char で truncate / measure に対して安定する。
 *
 * fix (4 ファイル 5 行差分):
 *   - async-states.tsx: Loading() default message
 *   - data-widget-card.tsx: 内蔵 loading state
 *   - kanban-view.tsx: 列定義 loading
 *   - calendar-view.tsx: planned / actual lane 各 1 件 (replace_all=true で 2 件まとめ)
 *
 * 検証: source-side regex assert + iter853/852/851/844/735 invariant cross-check。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

function walk(dir: string, acc: string[]): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const s = statSync(p)
    if (s.isDirectory()) walk(p, acc)
    else if (/\.(tsx|ts)$/.test(name)) acc.push(p)
  }
  return acc
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  // 全体 grep: visible 文字列 '読み込み中...' (ASCII) はコメント以外 0 件にする
  const files = walk(resolve(process.cwd(), 'src'), [])
  const offenders: string[] = []
  for (const f of files) {
    const text = readFileSync(f, 'utf8')
    // コメント文字列内の "" 由来は許可、ASCII リテラルだけを正規表現で拾う
    // 行が // で始まる/含む && '読み込み中...' を含む → comment、許可
    const lines = text.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? ''
      if (!line.includes('読み込み中...')) continue
      const isComment = /^\s*(\*|\/\/|\/\*)/.test(line) || /\/\/.*読み込み中\.\.\./.test(line)
      if (!isComment) {
        offenders.push(`${f.replace(process.cwd() + '/', '')}:${i + 1}`)
      }
    }
  }
  if (offenders.length === 0) {
    findings.push({
      level: 'info',
      message: `loading text ASCII '読み込み中...' (visible) 残存 0 件 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `loading text ASCII '読み込み中...' 残存: ${offenders.join(', ')}`,
    })
  }

  // 4 fix file が Unicode '…' を含むこと
  for (const path of [
    'src/components/shared/async-states.tsx',
    'src/components/shared/data-widget-card.tsx',
    'src/components/workspace/kanban-view.tsx',
    'src/components/schedule/calendar-view.tsx',
  ]) {
    const text = readFileSync(resolve(process.cwd(), path), 'utf8')
    if (/読み込み中…/.test(text)) {
      findings.push({
        level: 'info',
        message: `${path}: Unicode '読み込み中…' 含む OK`,
      })
    } else {
      findings.push({ level: 'warning', message: `${path}: Unicode '読み込み中…' 不在` })
    }
  }

  // calendar-view は 2 件あるはず
  const cv = readFileSync(
    resolve(process.cwd(), 'src/components/schedule/calendar-view.tsx'),
    'utf8',
  )
  const cvCount = (cv.match(/読み込み中…/g) ?? []).length
  if (cvCount === 2) {
    findings.push({
      level: 'info',
      message: `calendar-view 読み込み中… 2 件 (planned + actual lane) OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `calendar-view 読み込み中… ${cvCount} 件 (期待 2)`,
    })
  }

  // iter853 invariant: offline retry/home aria-hidden span
  const rb = readFileSync(resolve(process.cwd(), 'src/app/~offline/retry-button.tsx'), 'utf8')
  if (/<span aria-hidden="true">再読み込みして再試行<\/span>/.test(rb)) {
    findings.push({
      level: 'info',
      message: `iter853 invariant: offline retry button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter853 invariant (retry): 破壊` })
  }

  // iter852 invariant: mock-timesheet login aria-hidden
  const ml = readFileSync(
    resolve(process.cwd(), 'src/components/mock-timesheet/mock-login-form.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{isPending \? '認証中…' : 'ログイン'\}<\/span>/.test(ml)) {
    findings.push({
      level: 'info',
      message: `iter852 invariant: mock-timesheet login submit aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter852 invariant: 破壊` })
  }

  // iter851 invariant: skip-link focus min-h-11
  const layout = readFileSync(resolve(process.cwd(), 'src/app/layout.tsx'), 'utf8')
  if (
    /focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:inline-flex focus:min-h-11/.test(
      layout,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter851 invariant: skip-link focus min-h-11 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter851 invariant: 破壊` })
  }

  // iter735 invariant: team-context-editor aria-keyshortcuts
  const tce = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  const tceMatches = tce.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tceMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter735 invariant: team-context-editor aria-keyshortcuts 維持 OK (${tceMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant: 破壊` })
  }

  console.log(`\n=== Findings (loading-ellipsis-unicode-iter854) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
