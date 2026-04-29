/**
 * Phase 6.15 loop iter 357 — 5 button (team-context save / period-goal save /
 * goal create / sprint create / subtasks bulk-add) に
 * `aria-keyshortcuts="Meta+Enter Control+Enter"` を batch 追加、iter356 続編。
 *
 * 各 button は対応する Textarea / form で Cmd/Ctrl+Enter キーボードショートカットを
 * 受ける hot path。aria-keyshortcuts で voice-control / SR が programmatic に
 * shortcut を読み出せるように。あわせて team-context-save-btn と period-goal-save に
 * `aria-busy` も追加 (iter334-342 sweep の補完)。
 *
 * 機能追加なし、shadcn 編集なし、影響面 5 ファイル、約 7 行追加。
 *
 * 検証: source-side regex assert で codify。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  for (const path of [
    'src/components/workspace/team-context-editor.tsx',
    'src/components/workspace/personal-period-view.tsx',
    'src/components/workspace/goals-panel.tsx',
    'src/components/workspace/sprints-panel.tsx',
    'src/components/workspace/subtasks-panel.tsx',
  ]) {
    const src = readFileSync(resolve(process.cwd(), path), 'utf8')
    if (!/aria-keyshortcuts="Meta\+Enter Control\+Enter"/.test(src)) {
      findings.push({ level: 'warning', message: `${path}: aria-keyshortcuts 不在` })
    } else {
      findings.push({ level: 'info', message: `${path}: aria-keyshortcuts OK` })
    }
  }

  // iter356 invariant: comment-thread の aria-keyshortcuts 維持
  const ct = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/comment-thread.tsx'),
    'utf8',
  )
  if (!/aria-keyshortcuts="Meta\+Enter Control\+Enter"/.test(ct)) {
    findings.push({ level: 'warning', message: 'comment-thread.tsx: iter356 回帰' })
  }

  console.log(`\n=== Findings (keyshortcuts-batch-iter357) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
