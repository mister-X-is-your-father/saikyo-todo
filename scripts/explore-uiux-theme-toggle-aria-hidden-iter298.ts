/**
 * Phase 6.15 loop iter 298 — ThemeToggle の lucide-react Sun / Moon icon が
 * `aria-hidden` 指定無しで a11y tree に露出する可能性。
 *
 * 現状: theme-toggle.tsx の Button は `aria-label="テーマ切替"` で accessible
 * name を提供しているが、子要素 `<Sun />` `<Moon />` は lucide-react の
 * defaultAttributes に aria-hidden を含まない (defaultAttributes.js 参照、
 * width/height/viewBox/fill/stroke のみ)。Button content の SVG が name に
 * 含まれない仕様 (AccName Step 2B aria-label が優先) ではあるが、SR 実装
 * 依存で "graphic" 等を冗長 announce する場合があり、defensive に
 * aria-hidden 推奨。
 *
 * codebase 内の他 lucide 使用例:
 *   - async-states.tsx (Loader2, AlertTriangle): aria-hidden="true" 設定済 ✓
 *   - must-badge.tsx (AlertTriangle): aria-hidden="true" 設定済 ✓
 *   - theme-toggle.tsx (Sun, Moon): 漏れ ✗
 *
 * 期待 (fix 後):
 *   `<Sun aria-hidden="true" />` / `<Moon aria-hidden="true" />` で a11y
 *   tree から除外、Button の aria-label "テーマ切替" のみが announce される。
 *
 *   pnpm tsx scripts/explore-uiux-theme-toggle-aria-hidden-iter298.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const src = readFileSync(resolve(process.cwd(), 'src/components/shared/theme-toggle.tsx'), 'utf8')

  // 1. Sun と Moon に aria-hidden="true" が付いている
  if (!/<Sun [^>]*aria-hidden="true"/.test(src)) {
    findings.push({
      level: 'warning',
      message: `theme-toggle.tsx: <Sun> に aria-hidden="true" が無い`,
    })
  } else {
    findings.push({ level: 'info', message: `<Sun aria-hidden="true"> 確認 OK` })
  }
  if (!/<Moon [^>]*aria-hidden="true"/.test(src)) {
    findings.push({
      level: 'warning',
      message: `theme-toggle.tsx: <Moon> に aria-hidden="true" が無い`,
    })
  } else {
    findings.push({ level: 'info', message: `<Moon aria-hidden="true"> 確認 OK` })
  }

  // 2. Button の aria-label="テーマ切替" は維持されている
  if (!/aria-label="テーマ切替"/.test(src)) {
    findings.push({
      level: 'warning',
      message: `theme-toggle.tsx: Button aria-label="テーマ切替" が消えている`,
    })
  } else {
    findings.push({ level: 'info', message: `Button aria-label="テーマ切替" 維持 OK` })
  }

  console.log(`\n=== Findings (theme-toggle-aria-hidden-iter298) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
