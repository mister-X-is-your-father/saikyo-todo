/**
 * Phase 6.15 loop iter 837 (mode-D Desktop a11y) —
 * sprints-panel Sprint defaults 編集 form の キャンセル / 保存 button visible text を
 * aria-hidden span で wrap (一括)。
 *
 * 課題: sprints-panel.tsx の Sprint defaults 編集 form の Submit/Cancel button visible
 *   text は aria-label が完全 content を含むのに aria-hidden 無し。iter800-836 sweep の
 *   続編。
 *
 * fix (1 ファイル ~2 行差分):
 *   - キャンセル button visible "キャンセル" を aria-hidden で wrap
 *   - 保存 button visible "保存" / "保存中…" を aria-hidden で wrap
 *
 * 検証: source-side regex assert + iter735-836 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  const hasCancelAriaHidden =
    /data-testid="sprint-defaults-cancel"[\s\S]*?<span aria-hidden="true">キャンセル<\/span>/.test(
      sp,
    )
  const hasSaveAriaHidden =
    /<span aria-hidden="true">\{upd\.isPending \? '保存中…' : '保存'\}<\/span>/.test(sp)
  if (hasCancelAriaHidden && hasSaveAriaHidden) {
    findings.push({
      level: 'info',
      message: `sprint-defaults キャンセル + 保存 button aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-defaults button aria-hidden 不完全 (cancel=${hasCancelAriaHidden} save=${hasSaveAriaHidden})`,
    })
  }

  // iter836 invariant: sprint + goal create button aria-hidden
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{createMut\.isPending \? '作成中…' : '作成'\}<\/span>/.test(gp) &&
    /<span aria-hidden="true">\{createMut\.isPending \? '作成中…' : '作成'\}<\/span>/.test(sp)
  ) {
    findings.push({
      level: 'info',
      message: `iter836 invariant: sprint + goal create button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter836 invariant: 破壊` })
  }

  // iter834 invariant: heartbeat-button aria-hidden
  const hb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/heartbeat-button.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{scan\.isPending \? 'スキャン中…' : 'Heartbeat'\}<\/span>/.test(hb)
  ) {
    findings.push({
      level: 'info',
      message: `iter834 invariant: heartbeat-button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter834 invariant: 破壊` })
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

  console.log(`\n=== Findings (sprint-defaults-buttons-aria-hidden-iter837) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
