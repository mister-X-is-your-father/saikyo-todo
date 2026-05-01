/**
 * Phase 6.15 loop iter 543 (mode-D Desktop a11y) —
 * WorkflowsPanel WorkflowEditor cancel Button に aria-label + data-testid を補完。
 *
 * 課題: workflows-panel.tsx 行 614-621 の cancel Button は visible text "キャンセル"
 *   のみで aria-label / data-testid 不在。Workflow editor は graph + trigger JSON 編集の
 *   複雑な dialog で複数 Workflow が並ぶと SR は「キャンセル ボタン」だけで
 *   どの Workflow editor のキャンセルか区別不能。
 *
 * fix (1 ファイル ~2 行差分):
 *   - aria-label={`Workflow「${wf.name}」の編集をキャンセル`}
 *   - data-testid={`wf-editor-cancel-${wf.id}`}
 *
 * iter538 wf-editor-save と pair で Dialog footer 統一。+2 行差分、機能不変、
 * 視覚 layout 不変、shadcn 編集なし、type=button / variant / className / onClick invariant 維持。
 *
 * 検証: source-side regex assert + iter515-542 invariant cross-check。
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

  // 1. wf-editor-cancel aria-label + data-testid
  if (
    /data-testid=\{`wf-editor-cancel-\$\{wf\.id\}`\}\s+aria-label=\{`Workflow「\$\{wf\.name\}」の編集をキャンセル`\}/.test(
      wp,
    ) ||
    /aria-label=\{`Workflow「\$\{wf\.name\}」の編集をキャンセル`\}\s+data-testid=\{`wf-editor-cancel-\$\{wf\.id\}`\}/.test(
      wp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `workflows-panel.tsx: wf-editor-cancel aria-label + data-testid 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `workflows-panel.tsx: wf-editor-cancel aria-label / data-testid 不在`,
    })
  }

  // 2. iter538 invariant: wf-editor-save aria-busy 維持
  if (
    /aria-busy=\{saving \|\| undefined\}[\s\S]{0,400}data-testid=\{`wf-editor-save-\$\{wf\.id\}`\}|data-testid=\{`wf-editor-save-\$\{wf\.id\}`\}[\s\S]{0,400}aria-busy=\{saving \|\| undefined\}/.test(
      wp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter538 invariant: wf-editor-save aria-busy 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter538 invariant: 破壊`,
    })
  }

  // 3. iter537 invariant: WorkflowNodeRunsList output summary aria 維持
  if (/aria-label=\{`node \$\{nr\.nodeId\} の output \(jsonb\) を開閉`\}/.test(wp)) {
    findings.push({
      level: 'info',
      message: `iter537 invariant: WorkflowNodeRunsList output summary aria 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter537 invariant: 破壊`,
    })
  }

  // 4. iter515 anchor invariant
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (/aria-label=\{\s*importsOpen\s*\?\s*`Source「\$\{src\.name\}」の Pull 履歴/.test(ip)) {
    findings.push({
      level: 'info',
      message: `iter515 invariant: integrations-panel 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter515 invariant: 破壊`,
    })
  }

  console.log(`\n=== Findings (wf-editor-cancel-aria-iter543) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
