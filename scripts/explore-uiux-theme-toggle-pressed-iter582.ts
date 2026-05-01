/**
 * Phase 6.15 loop iter 582 (mode-D Desktop a11y) —
 * theme-toggle に aria-pressed (toggle button state) を補完。
 *
 * 課題: theme-toggle.tsx (行 14-30) は dark / light を切替える toggle button だが
 *   aria-pressed 不在で SR が "押されている / 押されていない" を announce しない。
 *   ARIA toggle button pattern (WAI-ARIA 1.2 button#example-toggle-button) では
 *   aria-pressed={true|false} 必須。
 *
 * fix (1 ファイル ~1 行差分):
 *   - aria-pressed={resolvedTheme === 'dark'}
 *
 * iter560 で aria-label を動的化済み、今回 aria-pressed を追加で toggle button
 * pattern が完成。視覚は CSS (dark: variant) で Sun/Moon icon を切替済み、SR は
 * 状態を announce 可能に。
 *
 * 検証: source-side regex assert + iter515-581 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  // 1. theme-toggle aria-pressed
  const tt = readFileSync(resolve(process.cwd(), 'src/components/shared/theme-toggle.tsx'), 'utf8')
  if (/aria-pressed=\{resolvedTheme === 'dark'\}/.test(tt)) {
    findings.push({
      level: 'info',
      message: `theme-toggle.tsx: aria-pressed 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `theme-toggle.tsx: aria-pressed 不在`,
    })
  }

  // 2. iter560 invariant: aria-label 動的化維持
  if (
    /aria-label=\{resolvedTheme === 'dark' \? 'ライトテーマに切替' : 'ダークテーマに切替'\}/.test(
      tt,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter560 invariant: theme-toggle aria-label 動的化維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter560 invariant: 破壊`,
    })
  }

  // 3. iter581 invariant: workflows-panel + templates-panel 作成 Button aria-keyshortcuts
  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  if (
    /data-testid="wf-create-btn"\s*\n\s*aria-keyshortcuts="Meta\+Enter Control\+Enter"/.test(wp)
  ) {
    findings.push({
      level: 'info',
      message: `iter581 invariant: wf-create-btn aria-keyshortcuts 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter581 invariant: 破壊`,
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

  console.log(`\n=== Findings (theme-toggle-pressed-iter582) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
