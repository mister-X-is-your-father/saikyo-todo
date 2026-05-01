/**
 * Phase 6.15 loop iter 581 (mode-D Desktop a11y) —
 * workflows-panel wf-create-btn と templates-panel 作成 Button に
 * aria-keyshortcuts="Meta+Enter Control+Enter" を補完。
 *
 * 課題: 両 Button とも form 内 Textarea で Cmd/Ctrl+Enter を購読し handleCreate を
 *   呼ぶが、aria-keyshortcuts 不在で SR / voice control に shortcut が expose されない。
 *
 * fix (2 ファイル ~4 行差分):
 *   - aria-keyshortcuts="Meta+Enter Control+Enter"
 *   - aria-label の active 状態に "Cmd/Ctrl+Enter でも可" 追記
 *
 * iter580 pattern (decompose-proposals-panel) を 2 件水平展開、Cmd/Ctrl+Enter shortcut
 * を持つ全 form save Button が aria-keyshortcuts 統一達成 (goals-panel / sprints-panel /
 * subtasks-panel / personal-period-view / team-context-editor / decompose-proposals-panel /
 * workflows-panel / templates-panel)。
 *
 * 検証: source-side regex assert + iter515-580 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  // 1. workflows-panel wf-create-btn aria-keyshortcuts
  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  if (
    /data-testid="wf-create-btn"\s*\n\s*aria-keyshortcuts="Meta\+Enter Control\+Enter"/.test(wp)
  ) {
    findings.push({
      level: 'info',
      message: `workflows-panel.tsx: wf-create-btn aria-keyshortcuts 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `workflows-panel.tsx: wf-create-btn aria-keyshortcuts 不在`,
    })
  }

  // 2. templates-panel 作成 Button aria-keyshortcuts
  const tp = readFileSync(
    resolve(process.cwd(), 'src/components/template/templates-panel.tsx'),
    'utf8',
  )
  if (
    /aria-busy=\{createMut\.isPending \|\| undefined\}\s*\n\s*aria-keyshortcuts="Meta\+Enter Control\+Enter"/.test(
      tp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `templates-panel.tsx: 作成 Button aria-keyshortcuts 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `templates-panel.tsx: 作成 Button aria-keyshortcuts 不在`,
    })
  }

  // 3. iter580 invariant: decompose-proposals save Button aria-keyshortcuts 維持
  const dpp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (
    /data-testid=\{`proposal-\$\{proposal\.id\}-save`\}\s*\n\s*aria-keyshortcuts="Meta\+Enter Control\+Enter"/.test(
      dpp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter580 invariant: decompose-proposals save aria-keyshortcuts 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter580 invariant: 破壊`,
    })
  }

  // 4. iter579 invariant: item-edit-save aria-keyshortcuts 維持
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (/data-testid="item-edit-save"\s*\n\s*aria-keyshortcuts="Meta\+S Control\+S"/.test(ied)) {
    findings.push({
      level: 'info',
      message: `iter579 invariant: item-edit-save aria-keyshortcuts 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter579 invariant: 破壊`,
    })
  }

  // 5. iter515 anchor invariant
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

  console.log(`\n=== Findings (create-btn-keyshortcuts-iter581) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
