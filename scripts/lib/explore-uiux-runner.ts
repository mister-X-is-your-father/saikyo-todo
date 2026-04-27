/**
 * Phase 6.15 iter119: explore-uiux スクリプト共通 middleware (HOF) runner。
 *
 * 既存 scripts/explore-uiux-*.ts は各々 try/finally で
 *   - ブラウザ close
 *   - context close
 *   - test user 削除
 * を書いていたが boilerplate 多 + close 漏れリスクあり。
 *
 * 本 runner はこれらを 1 つにまとめ、body() の例外有無に関わらず必ず後始末する。
 * 使い方:
 *
 *   import { runExplore } from './lib/explore-uiux-runner'
 *
 *   await runExplore({
 *     name: 'iter120-foo',
 *     viewport: { width: 1280, height: 800 },
 *     body: async ({ page, workspaceId, findings }) => {
 *       // ... interactions, push to findings
 *     },
 *   })
 */
import { type Browser, type BrowserContext, chromium, devices, type Page } from '@playwright/test'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import os from 'node:os'

const BASE = 'http://localhost:3001'
const SUPABASE_URL = 'http://127.0.0.1:54321'

/**
 * メモリアラート閾値:
 *   - free + buffers/cache が `MIN_AVAILABLE_BYTES` を下回ったら abort
 *   - process.memoryUsage().rss が `MAX_RSS_BYTES` を超えたら abort
 * Playwright chromium は RSS が暴れやすいので body 前後でチェック。
 */
const MIN_AVAILABLE_BYTES = 1.0 * 1024 * 1024 * 1024 // 1.0 GiB
const MAX_RSS_BYTES = 2.5 * 1024 * 1024 * 1024 // 2.5 GiB

interface MemoryReport {
  freeBytes: number
  totalBytes: number
  rssBytes: number
  freeRatio: number
}

function checkMemory(): MemoryReport {
  const totalBytes = os.totalmem()
  const freeBytes = os.freemem()
  const freeRatio = freeBytes / totalBytes
  const rssBytes = process.memoryUsage().rss
  return { freeBytes, totalBytes, rssBytes, freeRatio }
}

function fmt(b: number): string {
  return `${(b / 1024 / 1024 / 1024).toFixed(2)}GiB`
}

/**
 * メモリ枯渇アラート。閾値超過なら Error を throw して runner の finally を発火させる。
 * stderr に "ALERT" prefix で書く (パイプ集約ツールが拾えるように)。
 */
function alertIfLow(label: string): void {
  const m = checkMemory()
  const lowFree = m.freeBytes < MIN_AVAILABLE_BYTES
  const highRss = m.rssBytes > MAX_RSS_BYTES
  if (!lowFree && !highRss) return
  const msg =
    `[ALERT][${label}] memory pressure: ` +
    `free=${fmt(m.freeBytes)} (${(m.freeRatio * 100).toFixed(1)}%) ` +
    `rss=${fmt(m.rssBytes)} ` +
    `(threshold: free<${fmt(MIN_AVAILABLE_BYTES)} or rss>${fmt(MAX_RSS_BYTES)})`
  console.error(msg)
  throw new Error(msg)
}

export interface Finding {
  level: 'error' | 'warning' | 'info'
  source: 'console' | 'pageerror' | 'network' | 'a11y' | 'observation'
  message: string
}

export interface ExploreContext {
  page: Page
  context: BrowserContext
  browser: Browser
  workspaceId: string
  userId: string
  email: string
  password: string
  admin: SupabaseClient
  findings: Finding[]
}

export interface RunExploreOptions {
  /** ログ prefix + screenshot ファイル名に使う識別子。例: "iter120-foo" */
  name: string
  /** デフォルト 1280x800。device emulation したい場合は `device` を渡す */
  viewport?: { width: number; height: number }
  /** Playwright `devices` の key (例: 'iPhone 13')。指定すると `viewport` は無視 */
  device?: keyof typeof devices
  /** mobile タッチ emulation を有効化 (デフォルト false) */
  isMobile?: boolean
  /** body 内で findings に push する。runner が完了時に集計表示 */
  body: (ctx: ExploreContext) => Promise<void>
  /**
   * test user 作成後に追加で seed したい場合 (item / template 等) に呼ばれる。
   * page navigate 前に走るので RLS 観点で問題ない。
   */
  seed?: (admin: SupabaseClient, args: { workspaceId: string; userId: string }) => Promise<void>
  /** screenshot を /tmp/uiux-<name>.png に保存 (デフォルト true) */
  screenshot?: boolean
  /** body 後に findings 件数で process.exit code を出す (デフォルト true) */
  exitOnFindings?: boolean
}

/**
 * - test user / workspace を作成
 * - Playwright chromium 起動 + login で sign in
 * - body 実行 (例外も catch)
 * - 必ず close (browser → context → admin → user 削除) を通す
 * - findings を集計して stdout に出す
 */
export async function runExplore(options: RunExploreOptions): Promise<void> {
  const findings: Finding[] = []
  const stamp = Date.now()
  const email = `${options.name}-${stamp}@example.com`
  const password = 'password1234'
  const screenshotPath = `/tmp/uiux-${options.name}.png`
  const screenshotEnabled = options.screenshot !== false

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!serviceKey || !anonKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY が未設定')
  }

  // --- 0. メモリチェック (start 前) ---
  alertIfLow(`${options.name}/before-start`)

  const admin = createClient(SUPABASE_URL, serviceKey, {
    auth: { persistSession: false },
  })

  // --- 1. test user 作成 (必ず ↓ finally で削除) ---
  const cu = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (cu.error || !cu.data.user) throw cu.error ?? new Error('createUser returned no user')
  const userId = cu.data.user.id

  // --- 2. workspace 作成 ---
  const userClient = createClient(SUPABASE_URL, anonKey, {
    auth: { persistSession: false },
  })
  await userClient.auth.signInWithPassword({ email, password })
  const wsCreate = await userClient.rpc('create_workspace', {
    ws_name: options.name,
    ws_slug: `${options.name}-${stamp}`,
  })
  if (wsCreate.error || !wsCreate.data) {
    // ロールバック: user を削除して終了
    await admin.auth.admin.deleteUser(userId).catch(() => {})
    throw wsCreate.error ?? new Error('create_workspace returned no id')
  }
  const workspaceId = wsCreate.data as string

  // --- 3. seed (任意) ---
  if (options.seed) {
    try {
      await options.seed(admin, { workspaceId, userId })
    } catch (e) {
      await admin.auth.admin.deleteUser(userId).catch(() => {})
      throw e
    }
  }

  // --- 4. browser 起動 ---
  const browser = await chromium.launch({ headless: true })
  let context: BrowserContext | null = null
  let page: Page | null = null
  let bodyError: unknown = null
  try {
    if (options.device) {
      context = await browser.newContext({
        ...devices[options.device],
        hasTouch: options.isMobile ?? true,
        isMobile: options.isMobile ?? true,
      })
    } else {
      context = await browser.newContext({
        viewport: options.viewport ?? { width: 1280, height: 800 },
      })
    }
    page = await context.newPage()
    page.on('console', (m) => {
      if (m.type() === 'error' || m.type() === 'warning') {
        findings.push({
          level: m.type() as 'error' | 'warning',
          source: 'console',
          message: m.text().slice(0, 240),
        })
      }
    })
    page.on('pageerror', (e) => {
      findings.push({ level: 'error', source: 'pageerror', message: e.message.slice(0, 240) })
    })
    page.on('response', (res) => {
      if (res.status() >= 400 && !res.url().includes('/_next/')) {
        findings.push({
          level: 'warning',
          source: 'network',
          message: `${res.status()} ${res.request().method()} ${res.url().slice(0, 200)}`,
        })
      }
    })

    // --- 5. login (mobile なら tap、それ以外 click) ---
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
    await page.locator('input#email').fill(email)
    await page.locator('input#password').fill(password)
    if (options.isMobile) {
      await page.locator('button[type="submit"]').tap()
    } else {
      await page.locator('button[type="submit"]').click()
    }
    await page.waitForURL(`${BASE}/`, { timeout: 10_000 })

    // --- 6. body ---
    alertIfLow(`${options.name}/before-body`)
    await options.body({
      page,
      context,
      browser,
      workspaceId,
      userId,
      email,
      password,
      admin,
      findings,
    })

    if (screenshotEnabled) {
      await page.screenshot({ path: screenshotPath }).catch(() => {})
    }
  } catch (e) {
    bodyError = e
    findings.push({
      level: 'error',
      source: 'pageerror',
      message: `body threw: ${e instanceof Error ? e.message : String(e)}`,
    })
    if (screenshotEnabled && page) {
      await page.screenshot({ path: screenshotPath }).catch(() => {})
    }
  } finally {
    // --- 7. 必ず close + cleanup を通す ---
    if (context) await context.close().catch(() => {})
    await browser.close().catch(() => {})
    await admin.auth.admin.deleteUser(userId).catch(() => {})
  }

  // --- 7.5. close 後にメモリ状況を一行ログ (傾向観察用) ---
  const m = checkMemory()
  console.log(
    `[mem] ${options.name}: free=${fmt(m.freeBytes)} (${(m.freeRatio * 100).toFixed(1)}%) rss=${fmt(m.rssBytes)}`,
  )

  // --- 8. 集計表示 ---
  console.log(`\n=== Findings (${options.name}) ===`)
  if (findings.length === 0) console.log('(なし)')
  else for (const f of findings) console.log(`  [${f.level}/${f.source}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  if (bodyError) throw bodyError

  if (options.exitOnFindings !== false) {
    // 致命 (error level) があれば exit 1、warning は 0
    const fatal = findings.some((f) => f.level === 'error')
    process.exit(fatal ? 1 : 0)
  }
}

export const BASE_URL = BASE
