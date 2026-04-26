/**
 * Phase 6.11 検証 — PWA (Service Worker / manifest / icons / offline).
 *
 * 1. production build が public/sw.js を生成 (本スクリプトは事前 `pnpm build` 前提)
 * 2. `pnpm start` 起動後、以下が 200 OK:
 *    - /sw.js
 *    - /manifest.webmanifest (JSON parse 可能 + 必須フィールド)
 *    - /~offline (HTML)
 *    - /icon, /icon-512, /apple-icon (image/png)
 * 3. /login の HTML <head> に link rel=manifest / theme-color / apple-touch-icon
 * 4. SW 登録スクリプト (ServiceWorkerRegister) が含まれていること
 *
 * 実行 (server を別端末で起動しておく):
 *   pnpm build && pnpm start &
 *   pnpm tsx --env-file=.env.local scripts/verify-phase6_11-pwa.ts
 */
const BASE = 'http://localhost:3001'

interface CheckResult {
  step: string
  ok: boolean
  note: string
}
const results: CheckResult[] = []
const pass = (s: string, n: string) => {
  results.push({ step: s, ok: true, note: n })
  console.log(`  [✓] ${s} — ${n}`)
}
const fail = (s: string, n: string) => {
  results.push({ step: s, ok: false, note: n })
  console.log(`  [✗] ${s} — ${n}`)
}

async function checkOk(path: string, label: string, expectedContentType?: string) {
  const r = await fetch(`${BASE}${path}`, { redirect: 'manual' })
  const ct = r.headers.get('content-type') ?? ''
  if (r.status !== 200) {
    fail(label, `status=${r.status} ct=${ct}`)
    return null
  }
  if (expectedContentType && !ct.includes(expectedContentType)) {
    fail(label, `ct=${ct} expected=${expectedContentType}`)
    return r
  }
  pass(label, `200 ${ct}`)
  return r
}

async function main() {
  // 1. SW
  await checkOk('/sw.js', '/sw.js 200', 'javascript')

  // 2. Manifest
  const manRes = await checkOk('/manifest.webmanifest', '/manifest.webmanifest 200', 'json')
  if (manRes) {
    const json = await manRes.json()
    const required: Array<keyof typeof json> = [
      'name',
      'short_name',
      'start_url',
      'display',
      'theme_color',
      'background_color',
      'icons',
    ]
    const missing = required.filter((k) => !json[k])
    if (missing.length === 0) pass('manifest 必須フィールド', '全項目あり')
    else fail('manifest 必須フィールド', `欠損: ${missing.join(', ')}`)
    const has192 = (json.icons as Array<{ sizes: string }>).some((i) => i.sizes === '192x192')
    const has512 = (json.icons as Array<{ sizes: string }>).some((i) => i.sizes === '512x512')
    if (has192 && has512) pass('manifest icons 192/512', 'both present')
    else fail('manifest icons 192/512', `192=${has192} 512=${has512}`)
  }

  // 3. icons
  await checkOk('/icon', '/icon (192) 200', 'image/png')
  await checkOk('/icon-512', '/icon-512 200', 'image/png')
  await checkOk('/apple-icon', '/apple-icon 200', 'image/png')

  // 4. offline page
  await checkOk('/~offline', '/~offline 200', 'text/html')

  // 5. login HTML head
  const loginRes = await fetch(`${BASE}/login`)
  const loginHtml = await loginRes.text()
  const checks: Array<[string, string]> = [
    ['link rel=manifest', 'rel="manifest"'],
    ['theme-color light', 'name="theme-color" content="#f8fafc"'],
    ['theme-color dark', 'name="theme-color" content="#0f172a"'],
    ['apple-touch-icon', 'rel="apple-touch-icon"'],
    ['mobile-web-app-capable', 'name="mobile-web-app-capable" content="yes"'],
  ]
  for (const [label, needle] of checks) {
    if (loginHtml.includes(needle)) pass(`HTML head: ${label}`, 'OK')
    else fail(`HTML head: ${label}`, `not found ("${needle}")`)
  }

  // 6. SW register が JS bundle に含まれる (chunk のどこかに /sw.js 文字列)
  // sw-register.tsx は production で SW 登録するので、文字列 "/sw.js" がどこかに入るはず
  // chunk 名が動的なため、scan all <script src=...> chunks in the head
  const scriptSrcs = Array.from(loginHtml.matchAll(/<script[^>]+src="([^"]+)"/g)).map((m) => m[1])
  let foundSwRegister = false
  for (const src of scriptSrcs.slice(0, 30)) {
    if (!src) continue
    const u = src.startsWith('http') ? src : `${BASE}${src}`
    try {
      const c = await fetch(u)
      const t = await c.text()
      if (t.includes("'/sw.js'") || t.includes('"/sw.js"') || t.includes('serviceWorker')) {
        foundSwRegister = true
        break
      }
    } catch {
      // ignore
    }
  }
  if (foundSwRegister) pass('SW register script', 'navigator.serviceWorker / /sw.js 文字列確認')
  else fail('SW register script', '見つからない (build chunks 不一致)')

  console.log('\n=== 結果 ===')
  const ok = results.filter((r) => r.ok).length
  const total = results.length
  console.log(`PASS: ${ok}/${total}`)
  if (ok < total) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
