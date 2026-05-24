/**
 * Phase 6.15 loop iter1305: activity-log activity-detail-toggle button min-h-11 +
 * WCAG 2.5.5 (44x44 tap target) regression guard。
 *
 * iter1305 (modeM hazard 続き、comment-thread iter1303 / operation-board iter1304 と同 fix):
 * activity-log.tsx `activity-detail-toggle-${entry.id}` button は iter507 で `before:-inset-3`
 * pseudo expansion で 44x44 化を試みたが、visible が text-[11px] (line-height ~14px) で
 * 14+24=38px < 44 で WCAG 2.5.5 未達。`min-h-11 inline-flex items-center` 追加で 44 tall 化。
 *
 * 修正 (activity-log.tsx):
 *   - className に `inline-flex min-h-11 items-center` を追加
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-activity-detail-toggle-h11-iter1305.ts
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
  const filePath = resolve(here, '../src/components/workspace/activity-log.tsx')
  const src = readFileSync(filePath, 'utf8')

  if (
    !src.includes(
      'className="text-muted-foreground focus-visible:ring-ring relative mt-1 inline-flex min-h-11 items-center rounded text-[11px] underline before:absolute before:-inset-3 before:content-[\'\'] focus-visible:ring-2 focus-visible:outline-none"',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message:
        'activity-detail-toggle button className に inline-flex min-h-11 items-center が含まれていない',
    })
  }

  const codeOnly = src
    .split('\n')
    .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
    .join('\n')
  if (
    codeOnly.includes(
      'className="text-muted-foreground focus-visible:ring-ring relative mt-1 rounded text-[11px] underline before:absolute before:-inset-3 before:content-[\'\'] focus-visible:ring-2 focus-visible:outline-none"',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 className (min-h-11 なし、WCAG 2.5.5 未達 38px tall) が active code に残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — activity-detail-toggle button が min-h-11 で 44 tall (WCAG 2.5.5 satisfy)',
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
