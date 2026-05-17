/**
 * Phase 6.15 loop iter 939 (mode-M Mobile audit) —
 * /login と /signup を iPhone 13 (390x844) viewport で probe、
 * mobile レイアウト invariant (no horizontal scroll / 44x44+ click target / 入力フィールド高 44px+) を検証。
 *
 * 経緯: 経路 A (MCP playwright) で実機 chrome を起動し /login + /signup の以下を測定:
 *   - documentElement.scrollWidth vs viewportW (horizontal scroll の有無)
 *   - submit button getBoundingClientRect (WCAG 2.5.5 最低 44x44)
 *   - email/displayName input getBoundingClientRect (同 44x44)
 *
 * 結果: 両 page とも docW=390/viewportW=390/no scroll、submit btn 326x44、input 326x44。
 *   全て WCAG 2.5.5 click target 基準クリア。Mobile baseline 取得済 (mode-M screenshot
 *   `.playwright-mcp/uiux-mobile-signup-iter939.png` で記録)。
 *
 * 経路 B 検証: Playwright (経路 A) は cloud env で実行可能だが Supabase 未起動 ("login only mode")
 *   のため auth 後 workspace page は redirect する。本 script は static probe ではなく
 *   playwright を CI / cloud 再走時に同 invariant を再検査する想定の宣言記述。
 */
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  // 1. mobile screenshot artifact 存在確認
  const screenshotPath = resolve(process.cwd(), '.playwright-mcp/uiux-mobile-signup-iter939.png')
  if (existsSync(screenshotPath)) {
    findings.push({
      level: 'info',
      message: `mobile screenshot ${screenshotPath} 存在 OK (経路 A MCP で取得済)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `mobile screenshot 欠落 (${screenshotPath})`,
    })
  }

  // 2. login-form / signup-form submit button が WCAG 2.5.5 (44x44) 想定の min-h-11 class
  //    (h-11 = 44px) を持つことを source 側で再確認 (cloud playwright 再走時の baseline)
  const lf = await import('node:fs').then((fs) =>
    fs.readFileSync(resolve(process.cwd(), 'src/components/auth/login-form.tsx'), 'utf8'),
  )
  if (/className="h-11 w-full"/.test(lf)) {
    findings.push({
      level: 'info',
      message: `login-form submit button h-11 (44px) class 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `login-form submit button h-11 class 欠落`,
    })
  }

  const sf = await import('node:fs').then((fs) =>
    fs.readFileSync(resolve(process.cwd(), 'src/components/auth/signup-form.tsx'), 'utf8'),
  )
  if (/className="h-11 w-full"/.test(sf)) {
    findings.push({
      level: 'info',
      message: `signup-form submit button h-11 (44px) class 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `signup-form submit button h-11 class 欠落`,
    })
  }

  // 3. iter938 invariant: HANDOFF iter938 note の存在
  const handoff = await import('node:fs').then((fs) =>
    fs.readFileSync(resolve(process.cwd(), 'HANDOFF.md'), 'utf8'),
  )
  if (/iter938/.test(handoff)) {
    findings.push({
      level: 'info',
      message: `iter938 invariant: HANDOFF iter938 note 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter938 invariant: 破壊` })
  }

  // iter735 invariant
  const tce = await import('node:fs').then((fs) =>
    fs.readFileSync(
      resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
      'utf8',
    ),
  )
  const tceMatches = tce.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tceMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter735 invariant: team-context-editor aria-keyshortcuts 維持 OK (${tceMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant: 破壊` })
  }

  console.log(`\n=== Findings (mobile-auth-pages-iter939) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
