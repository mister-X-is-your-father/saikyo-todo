/**
 * Phase 6.15 loop iter1307: goals-panel kr-delete ✕ icon button min-h-11 min-w-11 +
 * WCAG 2.5.5 (44x44 tap target) 両軸 regression guard。
 *
 * iter1307 (modeM hazard 続き、comment-thread iter1303 / operation-board iter1304 /
 * activity-log iter1305 / kanban-edit iter1306 と同 fix): goals-panel.tsx `kr-delete-${kr.id}`
 * icon-only ✕ button は iter506 で `before:-inset-3` (12px) pseudo expansion で 44x44 化を
 * 試みたが、visible が text-xs (✕ ~16px 高さ、~8px 幅) で 16+24=40 vertical / 8+24=32
 * horizontal で両軸 WCAG 2.5.5 (44x44) 未達。
 *
 * 修正 (goals-panel.tsx):
 *   - className に `inline-flex min-h-11 min-w-11 items-center justify-center` を追加
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-kr-delete-h11-iter1307.ts
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
  const filePath = resolve(here, '../src/components/workspace/goals-panel.tsx')
  const src = readFileSync(filePath, 'utf8')

  if (
    !src.includes(
      'className="text-muted-foreground hover:text-destructive focus-visible:ring-ring relative inline-flex min-h-11 min-w-11 items-center justify-center text-xs before:absolute before:-inset-3 before:content-[\'\'] focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50 disabled:before:hidden"',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message:
        'kr-delete button className に min-h-11 min-w-11 inline-flex items-center justify-center が含まれていない',
    })
  }

  const codeOnly = src
    .split('\n')
    .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
    .join('\n')
  if (
    codeOnly.includes(
      'className="text-muted-foreground hover:text-destructive focus-visible:ring-ring relative text-xs before:absolute before:-inset-3 before:content-[\'\'] focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50 disabled:before:hidden"',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message:
        '旧 className (min-h-11 min-w-11 なし、WCAG 2.5.5 両軸未達 40x32px) が active code に残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — kr-delete button が min-h-11 min-w-11 で 両軸 44 (WCAG 2.5.5 satisfy)')
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
