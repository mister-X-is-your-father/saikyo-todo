/**
 * Phase 6.15 loop iter 780 (mode-D Desktop a11y) —
 * src/app/page.tsx の home page header に aria-label を追加。
 * iter763-race で WorkspaceHeader (workspace 内ページ) に aria-label を追加したのと
 * 整合させる、root home page version。
 *
 * 課題: page.tsx 行 26 の `<header>` は最強TODO のホーム画面ヘッダー (h1 + ログアウト button)
 *   だが aria-label が無い。`<header>` は <main> 直下のため implicit banner role なし。
 *   SR の landmark navigation で「ホーム header」 として到達できない。
 *
 * fix (1 ファイル ~1 行差分):
 *   - <header> に `aria-label="最強TODO ホーム header"` を追加
 *
 * 検証: source-side regex assert + iter735-779 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const hp = readFileSync(resolve(process.cwd(), 'src/app/page.tsx'), 'utf8')
  if (
    /<header className="flex items-center justify-between" aria-label="最強TODO ホーム header">/.test(
      hp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `home page header aria-label 追加 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `home page header aria-label 追加 不完全`,
    })
  }

  // iter779 invariant: layout noscript role=alert
  const lay = readFileSync(resolve(process.cwd(), 'src/app/layout.tsx'), 'utf8')
  if (
    /<noscript>\s*\n\s*<div\s*\n\s*className="bg-destructive text-destructive-foreground p-4 text-center text-sm"\s*\n\s*role="alert"\s*\n\s*>/.test(
      lay,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter779 invariant: layout noscript role="alert" 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter779 invariant: 破壊` })
  }

  // iter778 invariant: KR target Input required
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if (
    /value=\{target\}\s*\n\s*onChange=\{[^}]+\}\s*\n\s*placeholder="例: 100"\s*\n\s*className="[^"]+"\s*\n\s*required\s*\n\s*aria-required="true"/.test(
      gp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter778 invariant: KR target Input required 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter778 invariant: 破壊` })
  }

  // iter752 invariant: backlog-view empty state
  const bv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )
  if (/role="status"\s*\n\s*aria-live="polite"/.test(bv)) {
    findings.push({
      level: 'info',
      message: `iter752 invariant: backlog-view empty state 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter752 invariant: 破壊` })
  }

  // iter735 invariant: team-context-editor
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

  console.log(`\n=== Findings (home-header-aria-label-iter780) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
