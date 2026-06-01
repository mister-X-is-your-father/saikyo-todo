/**
 * Phase 6.15 loop iter1651 (mode-M mobile audit): schedule-item-picker / template-items-editor
 * の 2 IMEInput が shadcn Input default `h-9` (36px) で WCAG 2.5.5 (44x44 minimum tap target)
 * 違反していたのを `h-11` (44px) に統一。
 *
 * iter1647 (integrations 8 件) / iter1649 (workflows wf-name) と同 pattern の継続 sweep。
 *
 * - schedule-item-picker IMEInput (task 検索 box、autoFocus 即タップで重要)
 *   `className` 追加無 → `className="h-11"`
 * - template-items-editor IMEInput (子 Item タイトル input)
 *   `className="flex-1"` → `className="h-11 flex-1"`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-mobile-picker-tmpl-h11-iter1651.ts
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

  // 1. schedule-item-picker: autoFocus IMEInput に h-11
  const sip = readFileSync(
    resolve(here, '../src/components/schedule/schedule-item-picker.tsx'),
    'utf8',
  )
  if (!/<IMEInput\s+autoFocus\s+className="h-11"/.test(sip)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'schedule-item-picker autoFocus IMEInput に className="h-11" が無い',
    })
  }

  // 2. template-items-editor: 子 Item title IMEInput に h-11 (flex-1 と併記)
  const tie = readFileSync(
    resolve(here, '../src/components/template/template-items-editor.tsx'),
    'utf8',
  )
  if (!tie.includes('className="h-11 flex-1"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'template-items-editor 子 Item title IMEInput に className="h-11 flex-1" が無い',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — 2 IMEInput が h-11 (WCAG 2.5.5 satisfy)')
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
