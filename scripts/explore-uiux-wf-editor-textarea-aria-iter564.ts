/**
 * Phase 6.15 loop iter 564 (mode-D Desktop a11y) —
 * WorkflowsPanel WorkflowEditor の graph/trigger Textarea に aria-invalid + aria-describedby を補完。
 *
 * 課題: workflows-panel.tsx 行 505-513 (graph) と 592-600 (trigger) の Textarea は
 *   error state を持つ <p role="alert"> にリンクされておらず、aria-invalid 不在。
 *   error 出現時に SR は別個の alert は聞くが「どの textarea に問題があるか」が
 *   inline で伝わらない (form a11y pattern 不完全)。
 *
 * fix (1 ファイル ~4 行差分):
 *   - graph Textarea に aria-invalid={error?.startsWith('graph JSON 不正') || undefined}
 *     + aria-describedby={error ? `wf-editor-error-${wf.id}` : undefined}
 *   - trigger Textarea に aria-invalid={error?.startsWith('trigger JSON 不正') || undefined}
 *     + aria-describedby={error ? `wf-editor-error-${wf.id}` : undefined}
 *
 * 既存 error <p> は id={`wf-editor-error-${wf.id}`} + role="alert" を持つので、
 * aria-describedby で textarea から error message に直接リンク可能。
 *
 * +4 行差分、機能不変、視覚 layout 不変、shadcn 編集なし、既存 className / data-testid /
 * aria-label invariant 維持。
 *
 * 検証: source-side regex assert + iter515-563 invariant cross-check。
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

  // 1. graph textarea aria-invalid + aria-describedby
  if (
    /id=\{`wf-editor-graph-\$\{wf\.id\}`\}[\s\S]*?aria-invalid=\{error\?\.startsWith\('graph JSON 不正'\) \|\| undefined\}[\s\S]*?aria-describedby=\{error \? `wf-editor-error-\$\{wf\.id\}` : undefined\}/.test(
      wp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `workflows-panel.tsx: graph Textarea aria-invalid + aria-describedby 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `workflows-panel.tsx: graph Textarea aria-invalid / aria-describedby 不在`,
    })
  }

  // 2. trigger textarea aria-invalid + aria-describedby
  if (
    /id=\{`wf-editor-trigger-\$\{wf\.id\}`\}[\s\S]*?aria-invalid=\{error\?\.startsWith\('trigger JSON 不正'\) \|\| undefined\}[\s\S]*?aria-describedby=\{error \? `wf-editor-error-\$\{wf\.id\}` : undefined\}/.test(
      wp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `workflows-panel.tsx: trigger Textarea aria-invalid + aria-describedby 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `workflows-panel.tsx: trigger Textarea aria-invalid / aria-describedby 不在`,
    })
  }

  // 3. error <p> id + role=alert 維持
  if (
    /id=\{`wf-editor-error-\$\{wf\.id\}`\}/.test(wp) &&
    /role="alert"/.test(wp) &&
    /data-testid=\{`wf-editor-error-\$\{wf\.id\}`\}/.test(wp)
  ) {
    findings.push({
      level: 'info',
      message: `workflows-panel.tsx: error <p> id + role=alert + data-testid 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `workflows-panel.tsx: error <p> 既存 invariant 破壊`,
    })
  }

  // 4. iter563 invariant: team-capacity summary aria-label 維持
  const tcp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-capacity-panel.tsx'),
    'utf8',
  )
  if (
    /aria-label="チームメンバー 余裕時間 \(今日 \/ 今週\) を開閉"/.test(tcp) &&
    /data-testid="team-capacity-summary-toggle"/.test(tcp)
  ) {
    findings.push({
      level: 'info',
      message: `iter563 invariant: team-capacity summary aria 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter563 invariant: 破壊`,
    })
  }

  console.log(`\n=== Findings (wf-editor-textarea-aria-iter564) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
