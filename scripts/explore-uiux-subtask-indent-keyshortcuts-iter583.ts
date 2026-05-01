/**
 * Phase 6.15 loop iter 583 (mode-D Desktop a11y) —
 * subtasks-panel indent / outdent button に aria-keyshortcuts (Alt+ArrowLeft / Alt+ArrowRight)
 * を補完。
 *
 * 課題: subtasks-panel.tsx 行 134-145 で Alt+ArrowLeft/Right keyboard binding が
 *   onRowKeyDown に実装されており、aria-label / title にも "Alt+←" / "Alt+→" の文字
 *   情報はあるが、aria-keyshortcuts attribute は不在で SR / voice control が
 *   programmatic に shortcut を取得できない。
 *
 * fix (1 ファイル ~2 行差分):
 *   - outdent button: aria-keyshortcuts="Alt+ArrowLeft"
 *   - indent button:  aria-keyshortcuts="Alt+ArrowRight"
 *
 * iter580/581 (Cmd/Ctrl+Enter), iter579 (Cmd/Ctrl+S), iter356 (comment-thread Meta+Enter)
 * pattern を Alt+Arrow shortcut に展開、ARIA 1.2 attribute (modifier 必須形式) で統一。
 *
 * 検証: source-side regex assert + iter515-582 invariant cross-check。
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
    resolve(process.cwd(), 'src/components/workspace/subtasks-panel.tsx'),
    'utf8',
  )

  // 1. outdent button aria-keyshortcuts
  if (
    /data-testid=\{`subtask-outdent-\$\{item\.id\}`\}\s*\n\s*aria-keyshortcuts="Alt\+ArrowLeft"/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `subtasks-panel.tsx: outdent button aria-keyshortcuts 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `subtasks-panel.tsx: outdent button aria-keyshortcuts 不在`,
    })
  }

  // 2. indent button aria-keyshortcuts
  if (
    /data-testid=\{`subtask-indent-\$\{item\.id\}`\}\s*\n\s*aria-keyshortcuts="Alt\+ArrowRight"/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `subtasks-panel.tsx: indent button aria-keyshortcuts 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `subtasks-panel.tsx: indent button aria-keyshortcuts 不在`,
    })
  }

  // 3. iter582 invariant: theme-toggle aria-pressed
  const tt = readFileSync(resolve(process.cwd(), 'src/components/shared/theme-toggle.tsx'), 'utf8')
  if (/aria-pressed=\{resolvedTheme === 'dark'\}/.test(tt)) {
    findings.push({
      level: 'info',
      message: `iter582 invariant: theme-toggle aria-pressed 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter582 invariant: 破壊`,
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

  console.log(`\n=== Findings (subtask-indent-keyshortcuts-iter583) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
