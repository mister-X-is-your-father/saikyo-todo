/**
 * Phase 6.15 loop iter1304: operation-board-widget done-yesterday-toggle button min-h-11 +
 * WCAG 2.5.5 (44x44 tap target) regression guard。
 *
 * iter1304 で発見 (comment-thread iter1303 modeM の続き): operation-board-widget.tsx
 * `operation-board-done-yesterday-toggle` button は iter514 で `before:-inset-3` pseudo
 * expansion で 44x44 化を試みたが、visible が text-xs (16px) + flex items-center で
 * 16+24=40px しか expand せず、WCAG 2.5.5 未達。`min-h-11` 追加で 44 tall を強制。
 *
 * 修正 (operation-board-widget.tsx):
 *   - className に `min-h-11` を追加 (flex items-center 既存と組み合わせて vertical center)
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-operation-board-done-toggle-h11-iter1304.ts
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
  const filePath = resolve(here, '../src/components/workspace/operation-board-widget.tsx')
  const src = readFileSync(filePath, 'utf8')

  // 新 className が存在することを確認
  if (
    !src.includes(
      'className="hover:text-foreground text-muted-foreground focus-visible:ring-ring relative flex min-h-11 items-center gap-1 rounded text-xs before:absolute before:-inset-3 before:content-[\'\'] focus-visible:ring-2 focus-visible:outline-none"',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message:
        'operation-board-done-yesterday-toggle button className に min-h-11 が含まれていない',
    })
  }

  // 旧 className (min-h-11 なし) の active code 残存を確認 (comment 内の言及は除外)
  const codeOnly = src
    .split('\n')
    .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
    .join('\n')
  if (
    codeOnly.includes(
      'className="hover:text-foreground text-muted-foreground focus-visible:ring-ring relative flex items-center gap-1 rounded text-xs before:absolute before:-inset-3 before:content-[\'\'] focus-visible:ring-2 focus-visible:outline-none"',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 className (min-h-11 なし、WCAG 2.5.5 未達 40px tall) が active code に残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — operation-board-done-yesterday-toggle button が min-h-11 で 44 tall (WCAG 2.5.5 satisfy)',
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
