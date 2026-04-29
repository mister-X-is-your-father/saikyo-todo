/**
 * Phase 6.15 loop iter 293 — iter292 で Toaster theme="system" にしたが
 * sonner は prefers-color-scheme を直接 query するため、user が in-app
 * theme toggle で system 設定を override した場合 (system=light、user 選択=dark
 * など) に ThemeProvider と乖離して toast だけ system 値のまま残る問題。
 *
 * fix: 新規 client wrapper `ThemedToaster` を作成し、`useTheme().resolvedTheme`
 * を取って Toaster の theme prop に渡す。next-themes の resolvedTheme は
 * user 選択 + system fallback を解決した値なので、in-app theme と完全同期。
 *
 * 構成:
 *   - 新規: src/components/shared/themed-toaster.tsx (client component、
 *     useTheme + Toaster wrapper)
 *   - 変更: src/app/layout.tsx の `<Toaster theme="system" ...>` を
 *     `<ThemedToaster ...>` に置換、`Toaster` import を `ThemedToaster` に変更
 *
 * Supabase 不要。next-themes inline script で hydration 前に html.class
 * が決まるため、ThemedToaster の useTheme() は最初から正しい値を取得する。
 *
 *   pnpm tsx scripts/explore-uiux-themed-toaster-iter293.ts
 */
import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

const BASE = 'http://localhost:3001'

async function main(): Promise<void> {
  const findings: Finding[] = []

  // 1. source 側 assert: layout.tsx に ThemedToaster 使用、Toaster 直 import 無し
  const layoutSrc = readFileSync(resolve(process.cwd(), 'src/app/layout.tsx'), 'utf8')
  if (layoutSrc.includes("from 'sonner'")) {
    findings.push({
      level: 'warning',
      message: `src/app/layout.tsx: sonner Toaster の直 import が残っている (ThemedToaster wrapper 経由が期待)`,
    })
  }
  if (!/<ThemedToaster\b/.test(layoutSrc)) {
    findings.push({
      level: 'warning',
      message: `src/app/layout.tsx: <ThemedToaster> が見つからない`,
    })
  } else {
    findings.push({ level: 'info', message: `src/app/layout.tsx: <ThemedToaster> 使用 OK` })
  }

  // 2. ThemedToaster client component が存在し useTheme + Toaster をパススルー
  const tt = readFileSync(
    resolve(process.cwd(), 'src/components/shared/themed-toaster.tsx'),
    'utf8',
  )
  if (!tt.includes("'use client'")) {
    findings.push({
      level: 'warning',
      message: `themed-toaster.tsx: 'use client' ディレクティブが無い (next-themes hook 必須)`,
    })
  }
  if (!/useTheme\b/.test(tt)) {
    findings.push({
      level: 'warning',
      message: `themed-toaster.tsx: useTheme hook を使っていない`,
    })
  }
  if (!/from 'sonner'/.test(tt)) {
    findings.push({
      level: 'warning',
      message: `themed-toaster.tsx: sonner Toaster を import していない`,
    })
  }
  findings.push({ level: 'info', message: `themed-toaster.tsx: ${tt.length} bytes` })

  // 3. runtime: /login で Toaster section が存在し iter288 invariant (containerAriaLabel="通知")
  //    が維持されている (回帰防止)
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await context.newPage()
  page.on('pageerror', (e) => {
    findings.push({ level: 'error', message: `pageerror: ${e.message}`.slice(0, 240) })
  })
  try {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
    const sectionAriaLabel = await page
      .locator('section[aria-label]')
      .first()
      .getAttribute('aria-label')
    findings.push({
      level: 'info',
      message: `/login (回帰): section aria-label=${JSON.stringify(sectionAriaLabel)}`,
    })
    if (!sectionAriaLabel || !sectionAriaLabel.startsWith('通知')) {
      findings.push({
        level: 'warning',
        message: `/login: containerAriaLabel="通知" の効果が消えている (iter288 invariant)`,
      })
    }
  } finally {
    await context.close().catch(() => {})
    await browser.close().catch(() => {})
  }

  console.log(`\n=== Findings (themed-toaster-iter293) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
