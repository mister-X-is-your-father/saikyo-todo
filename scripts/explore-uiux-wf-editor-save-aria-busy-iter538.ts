/**
 * Phase 6.15 loop iter 538 (mode-D Desktop a11y) —
 * WorkflowsPanel WorkflowEditor save Button に aria-busy を補完。
 *
 * 課題: workflows-panel.tsx 行 622-635 の wf-editor-save Button は disabled +
 *   aria-label 動的付与済 (pending / normal) だが aria-busy 不在。SR は
 *   disabled (= 禁止) と pending (= 処理中) を区別できない。
 *
 * fix (1 ファイル ~1 行差分):
 *   - save Button に aria-busy={saving || undefined}
 *
 * iter521-528 form/Button aria-busy sweep の継続。
 * +1 行差分、機能不変、視覚 layout 不変、shadcn 編集なし、disabled / type=button /
 * aria-label / data-testid invariant 維持。
 *
 * 検証: source-side regex assert + iter515-537 invariant cross-check。
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

  // 1. wf-editor-save aria-busy
  if (
    /data-testid=\{`wf-editor-save-\$\{wf\.id\}`\}[\s\S]{0,400}aria-busy=\{saving \|\| undefined\}/.test(
      wp,
    ) ||
    /aria-busy=\{saving \|\| undefined\}[\s\S]{0,400}data-testid=\{`wf-editor-save-\$\{wf\.id\}`\}/.test(
      wp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `workflows-panel.tsx: wf-editor-save aria-busy 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `workflows-panel.tsx: wf-editor-save aria-busy 不在`,
    })
  }

  // 2. 既存 disabled / aria-label 維持
  if (
    /disabled=\{saving\}/.test(wp) &&
    /Workflow「\$\{wf\.name\}」の編集を保存中…/.test(wp) &&
    /Workflow「\$\{wf\.name\}」の graph \/ trigger を保存/.test(wp)
  ) {
    findings.push({
      level: 'info',
      message: `workflows-panel.tsx: wf-editor-save 既存 disabled / aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `workflows-panel.tsx: 既存属性破壊`,
    })
  }

  // 3. iter537 invariant: WorkflowNodeRunsList output summary aria 維持
  if (
    /aria-label=\{`node \$\{nr\.nodeId\} の output \(jsonb\) を開閉`\}/.test(wp) &&
    /data-testid=\{`wf-node-run-output-summary-\$\{nr\.id\}`\}/.test(wp)
  ) {
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

  // 4. iter515-535 anchor invariant
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  const bv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )
  const ok515 = /aria-label=\{\s*importsOpen\s*\?\s*`Source「\$\{src\.name\}」の Pull 履歴/.test(ip)
  const ok535 = /aria-label=\{`「\$\{row\.original\.title\}」を編集`\}/.test(bv)
  if (ok515 && ok535) {
    findings.push({
      level: 'info',
      message: `iter515 + iter535 anchor invariant 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter515 / iter535 invariant: 破壊 (515=${ok515} 535=${ok535})`,
    })
  }

  console.log(`\n=== Findings (wf-editor-save-aria-busy-iter538) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
