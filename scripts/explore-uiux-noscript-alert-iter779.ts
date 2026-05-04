/**
 * Phase 6.15 loop iter 779 (mode-D Desktop a11y) —
 * layout.tsx の <noscript> 内 div に role="alert" を追加。
 *
 * 課題: layout.tsx 行 77-81 の `<noscript>` 内 div は JavaScript 無効環境で
 *   表示される最強TODO のシステム要件警告だが、role="alert" なし。
 *   JS 無効 + SR ユーザは visit 直後に警告 を assertive announce しない。
 *   noscript 内 content は JS 無効時のみ HTML として interpret されるので、
 *   role="alert" は JS 無効環境でのみ activate される (一般ユーザには無影響)。
 *
 * fix (1 ファイル ~1 行差分):
 *   - noscript 内 div に `role="alert"` 追加
 *
 * 検証: source-side regex assert + iter735-778 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const lay = readFileSync(resolve(process.cwd(), 'src/app/layout.tsx'), 'utf8')
  if (
    /<noscript>\s*\n\s*<div\s*\n\s*className="bg-destructive text-destructive-foreground p-4 text-center text-sm"\s*\n\s*role="alert"\s*\n\s*>/.test(
      lay,
    )
  ) {
    findings.push({
      level: 'info',
      message: `layout noscript div role="alert" 追加 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `layout noscript div role="alert" 追加 不完全`,
    })
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

  // iter777 invariant: sprint-defaults-length required
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (
    /id="sprint-defaults-length"\s*\n\s*type="number"[^]+\s*\n\s*required\s*\n\s*aria-required="true"/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter777 invariant: sprint-defaults-length required 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter777 invariant: 破壊` })
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

  console.log(`\n=== Findings (noscript-alert-iter779) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
