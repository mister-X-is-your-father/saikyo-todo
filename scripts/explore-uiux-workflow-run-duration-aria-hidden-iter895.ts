/**
 * Phase 6.15 loop iter 895 (mode-D Desktop a11y) —
 * workflows-panel の wf-run-toggle button 内 visible duration span に aria-hidden 追加、
 * button aria-label 単独経路に統一。
 *
 * 経緯: iter879 続編。workflows-panel の Workflow run row toggle button は
 *   aria-label "${triggerKind} 実行 (${formatRunTime(r)}) のノード詳細を表示/閉じる"
 *   完全 content を持つが、内部 visible:
 *     - {r.triggerKind} span (aria-hidden 済)
 *     - <time>{formatRunTime}</time> (aria-hidden 済)
 *     - {formatRunDuration} span (aria-hidden 無し ← この iter で fix)
 *   3 番目の duration span は SR で button aria-label と独立に読まれる重複 + ノイズ。
 *
 * 修正: visible duration span に aria-hidden="true" 追加、button aria-label 単独経路に統一。
 *
 * 検証: source-side regex assert + iter735/843/849-894 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )

  // 1. visible duration span に aria-hidden 追加
  if (
    /<span className="text-muted-foreground ml-auto tabular-nums" aria-hidden="true">\s*\{formatRunDuration\(r\)\}\s*<\/span>/.test(
      wp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `workflows-panel run duration span aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `workflows-panel run duration span aria-hidden 未統合`,
    })
  }

  // 2. button aria-label 維持 (2 状態 isOpen toggle)
  if (
    /aria-label=\{[\s\S]+?`\$\{r\.triggerKind\} 実行 \(\$\{formatRunTime\(r\)\}\) のノード詳細を閉じる`/.test(
      wp,
    ) &&
    /aria-label=\{[\s\S]+?`\$\{r\.triggerKind\} 実行 \(\$\{formatRunTime\(r\)\}\) のノード詳細を表示`/.test(
      wp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `workflows-panel run toggle button aria-label 2 状態 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `workflows-panel run toggle aria-label 破壊`,
    })
  }

  // 3. 既存 aria-hidden (triggerKind / time) 維持
  if (
    /<span className="text-muted-foreground" aria-hidden="true">\s*\{r\.triggerKind\}\s*<\/span>/.test(
      wp,
    ) &&
    /<time[\s\S]+?aria-hidden="true"[\s\S]+?>\s*\{formatRunTime\(r\)\}\s*<\/time>/.test(wp)
  ) {
    findings.push({
      level: 'info',
      message: `workflows-panel triggerKind + time aria-hidden 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `workflows-panel triggerKind / time aria-hidden 破壊`,
    })
  }

  // iter894 invariant
  const iv = readFileSync(resolve(process.cwd(), 'src/components/workspace/inbox-view.tsx'), 'utf8')
  if (
    /<span\s+className="truncate text-left font-medium"[\s\S]+?aria-hidden="true"[\s\S]+?>\s*\{it\.title\}\s*<\/span>/.test(
      iv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter894 invariant: inbox-view title span aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter894 invariant: 破壊` })
  }

  // iter735 invariant
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

  console.log(`\n=== Findings (workflow-run-duration-aria-hidden-iter895) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
