/**
 * Phase 6.15 loop iter1308: subtasks-panel.tsx の icon-only button 3 種 (drag / outdent / indent)
 * min-h-11 min-w-11 + WCAG 2.5.5 (44x44 tap target) 両軸 regression guard。
 *
 * iter1308 (modeM hazard 続き、comment-thread iter1303 / kanban-edit iter1306 /
 * kr-delete iter1307 と同 fix): subtasks-panel.tsx の 3 button (subtask-drag /
 * subtask-outdent / subtask-indent) は iter508 で `before:-inset-3` (12px) pseudo
 * expansion で 44x44 化を試みたが、visible icon が 16x16 (h-4 w-4) または 14x14
 * (h-3.5 w-3.5) で両軸 38-40px、WCAG 2.5.5 未達。`inline-flex min-h-11 min-w-11
 * items-center justify-center` 追加で両軸 44 強制。
 *
 * 修正 (subtasks-panel.tsx):
 *   - subtask-drag (line ~159): 旧 `... relative -ml-1 cursor-grab touch-none rounded ...`
 *     → 新 `... relative -ml-1 inline-flex min-h-11 min-w-11 cursor-grab touch-none items-center justify-center rounded ...`
 *   - subtask-outdent / subtask-indent (line ~202, ~227): 旧 `... relative rounded ...`
 *     → 新 `... relative inline-flex min-h-11 min-w-11 items-center justify-center rounded ...`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-subtasks-h11-iter1308.ts
 * 前提: なし (source 直読 invariant)
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

interface Finding {
  level: 'error' | 'warning' | 'info'
  source: string
  message: string
}

async function main() {
  const findings: Finding[] = []
  const here = dirname(fileURLToPath(import.meta.url))
  const filePath = resolve(here, '../src/components/workspace/subtasks-panel.tsx')
  const src = readFileSync(filePath, 'utf8')

  // 新 className が存在することを確認 (drag)
  if (
    !src.includes(
      'className="text-muted-foreground hover:text-foreground focus-visible:ring-ring relative -ml-1 inline-flex min-h-11 min-w-11 cursor-grab touch-none items-center justify-center rounded before:absolute before:-inset-3 before:content-[\'\'] focus-visible:ring-2 focus-visible:outline-none active:cursor-grabbing"',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'subtask-drag button className に min-h-11 min-w-11 inline-flex が含まれていない',
    })
  }

  // 新 className が存在することを確認 (outdent / indent 共通の min-h-11 + min-w-11 + inline-flex)
  const outdentIndentCount = (
    src.match(
      /className="text-muted-foreground hover:text-foreground focus-visible:ring-ring relative inline-flex min-h-11 min-w-11 items-center justify-center rounded before:absolute before:-inset-3 before:content-\[''\] focus-visible:ring-2 focus-visible:outline-none disabled:opacity-30 disabled:before:hidden"/g,
    ) ?? []
  ).length
  if (outdentIndentCount !== 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `outdent / indent button の min-h-11 min-w-11 inline-flex className が 2 件無い (見つかった: ${outdentIndentCount})`,
    })
  }

  // 旧 className の active code 残存を確認 (comment 内の言及は除外)
  const codeOnly = src
    .split('\n')
    .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
    .join('\n')
  if (
    codeOnly.includes(
      'className="text-muted-foreground hover:text-foreground focus-visible:ring-ring relative -ml-1 cursor-grab touch-none rounded before:absolute before:-inset-3 before:content-[\'\'] focus-visible:ring-2 focus-visible:outline-none active:cursor-grabbing"',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 subtask-drag className (min-h-11 min-w-11 なし) が active code に残存',
    })
  }
  if (
    codeOnly.match(
      /className="text-muted-foreground hover:text-foreground focus-visible:ring-ring relative rounded before:absolute before:-inset-3 before:content-\[''\] focus-visible:ring-2 focus-visible:outline-none disabled:opacity-30 disabled:before:hidden"/,
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 subtask-outdent/indent className (min-h-11 min-w-11 なし) が active code に残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — subtask-drag / -outdent / -indent button が min-h-11 min-w-11 で 両軸 44 (WCAG 2.5.5 satisfy)',
    )
  } else {
    for (const f of findings) console.log(`  [${f.level}/${f.source}] ${f.message}`)
  }
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
