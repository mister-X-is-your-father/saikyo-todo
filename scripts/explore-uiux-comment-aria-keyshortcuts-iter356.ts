/**
 * Phase 6.15 loop iter 356 — comment-thread の Post button に
 * `aria-keyshortcuts="Meta+Enter Control+Enter"` を追加して SR / voice-control
 * ユーザに shortcut を expose。
 *
 * 課題: WAI-ARIA 1.2 で `aria-keyshortcuts` 属性は WCAG 2.1.4 (Character Key
 *   Shortcuts) のための a11y hint。voice-control (Dragon NaturallySpeaking /
 *   Voice Access) が "press shortcut" の形で利用、SR (NVDA / VoiceOver) も
 *   focus 時に shortcut hint を読み上げ可能。現状 codebase 全体で aria-keyshortcuts
 *   不在 → comment-thread Cmd+Enter (iter228) を最初に明示。
 *
 * fix: `aria-keyshortcuts="Meta+Enter Control+Enter"` 追加 (1 行)。Meta は macOS
 *   Cmd、Control は Windows / Linux Ctrl。空白区切りで複数 shortcut を列挙。
 *
 * 機能追加なし、shadcn 編集なし、影響面 1 ファイル。
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
  const target = 'src/components/workspace/comment-thread.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  if (!/aria-keyshortcuts="Meta\+Enter Control\+Enter"/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: aria-keyshortcuts 不在`,
    })
  } else {
    findings.push({ level: 'info', message: `${target}: aria-keyshortcuts OK` })
  }

  console.log(`\n=== Findings (comment-aria-keyshortcuts-iter356) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
