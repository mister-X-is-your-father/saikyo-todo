/**
 * Phase 6.15 loop iter 830 (mode-D Desktop a11y) —
 * src/app/page.tsx Workspace Link 内 visible content を aria-hidden で wrap。
 *
 * 課題: app/page.tsx 行 80-90 の Link 内 visible content (h3 ws.name + p slug/role
 *   + 矢印) は parent Link に aria-label が完全 content を含むのに、内側 div は
 *   aria-hidden 無し (矢印 span だけ aria-hidden)。SR ユーザは Link aria-label を
 *   聞いた後、内側 h3 ws.name + p slug/role が再度読み上げられる重複。
 *
 * fix (1 ファイル ~3 行差分):
 *   - 内側 flex container div に aria-hidden="true" 追加 (内側 全 visible content を 1 段で hide)
 *   - 矢印 span の aria-hidden を削除 (parent で hidden 済、二重不要)
 *
 * 検証: source-side regex assert + iter735-829 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const pg = readFileSync(resolve(process.cwd(), 'src/app/page.tsx'), 'utf8')
  const hasOuterAriaHidden =
    /<div className="flex items-center justify-between" aria-hidden="true">/.test(pg)
  if (hasOuterAriaHidden) {
    findings.push({
      level: 'info',
      message: `home page Workspace Link 内 outer div aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `home page Workspace Link aria-hidden 不完全`,
    })
  }

  // iter829 invariant: archive Restore button aria-hidden
  const aip = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/archived-items-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{unarchive\.isPending \? '復元中…' : '復元'\}<\/span>/.test(aip)) {
    findings.push({
      level: 'info',
      message: `iter829 invariant: archive Restore button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter829 invariant: 破壊` })
  }

  // iter828 invariant: sprint-card 期間進捗 row group + 内側 aria-hidden
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`Sprint「\$\{sprint\.name\}」期間進捗 経過/.test(sp) &&
    /<span aria-hidden="true">残 \{remainingDays\} 日<\/span>/.test(sp)
  ) {
    findings.push({
      level: 'info',
      message: `iter828 invariant: sprint-card 期間進捗 row aria 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter828 invariant: 破壊` })
  }

  // iter826 invariant: backlog updatedAt time semantic
  const bv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )
  if (/<time dateTime=\{iso\} aria-label=\{`最終更新 \$\{display\}`\}>/.test(bv)) {
    findings.push({
      level: 'info',
      message: `iter826 invariant: backlog updatedAt time semantic 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter826 invariant: 破壊` })
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

  console.log(`\n=== Findings (home-workspace-link-aria-hidden-iter830) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
