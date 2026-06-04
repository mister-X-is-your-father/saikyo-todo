/**
 * Phase 6.15 loop iter1722: mock-top-nav session ID 表示の visible truncate + sr-only
 * full UUID + title hover disclosure。SR / sighted で情報量等価、visible は scan 容易。
 *
 * 発見した UX gap:
 *   src/components/mock-timesheet/mock-top-nav.tsx (旧):
 *     <p className="text-muted-foreground text-xs">
 *       <span className="sr-only">現在の session ID: </span>
 *       <span aria-hidden="true">ログイン中: </span>
 *       <span className="font-mono">{sessionId}</span>
 *     </p>
 *   - visible は full UUID (例: "ログイン中: 8a3f4b6c-1234-5678-9abc-def012345678")
 *     で sighted には長すぎて scan しにくい (header 上部、横幅圧迫)
 *   - SR は full UUID を読む (sr-only "現在の session ID: " + visible "ログイン中: " +
 *     font-mono full UUID = "現在の session ID:  ログイン中: 8a3f..." と重複 + 長文)
 *     ※ aria-hidden=true で "ログイン中: " span は SR 除外、SR は sr-only + font-mono のみ
 *
 * 修正 (src/components/mock-timesheet/mock-top-nav.tsx, 3 line 差替 + 4 line comment):
 *   - <p> に `title={sessionId}` 属性 (sighted hover で全 UUID disclose)
 *   - sr-only span 内に full sessionId を含める (`現在の session ID: {sessionId}`)
 *   - aria-hidden span 内に visible "ログイン中: " + nested font-mono 8 char truncate +
 *     U+2026 ellipsis (`{sessionId.slice(0, 8)}…`)
 *   - SR は sr-only で full、sighted は visible で 8 char + hover で full
 *   - 情報量等価、scan 容易、shadcn 編集なし、機能追加なし
 *
 * 実行: pnpm tsx scripts/explore-uiux-mock-top-nav-session-truncate-iter1722.ts
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

  const mockTopNav = readFileSync(
    resolve(here, '../src/components/mock-timesheet/mock-top-nav.tsx'),
    'utf8',
  )

  // --- 1. <p> に title={sessionId} 付与済 (hover で全 UUID disclose) ---
  if (!mockTopNav.includes('title={sessionId}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'mock-top-nav.tsx の <p> に title={sessionId} が無い',
    })
  }

  // --- 2. sr-only span が full sessionId を含む ---
  if (!mockTopNav.includes('現在の session ID: {sessionId}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'mock-top-nav.tsx の sr-only span に full {sessionId} が含まれない',
    })
  }

  // --- 3. visible 部に 8 char + ellipsis (U+2026) truncate ---
  if (!mockTopNav.includes('{sessionId.slice(0, 8)}…')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'mock-top-nav.tsx に sessionId.slice(0, 8)… (truncate + U+2026) が無い',
    })
  }

  // --- 4. font-mono span 維持 (truncate UUID の visual styling) ---
  if (!mockTopNav.match(/className="font-mono"[\s\S]{0,80}sessionId\.slice/)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'mock-top-nav.tsx に font-mono span (truncated sessionId) が無い',
    })
  }

  // --- 5. aria-hidden visual prefix "ログイン中: " 維持 ---
  if (!mockTopNav.match(/aria-hidden="true"[\s\S]{0,80}ログイン中: /)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'mock-top-nav.tsx の aria-hidden "ログイン中: " span が消えている',
    })
  }

  // --- 6. iter1721 reference invariant: mock-entries body ID <th scope="row"> 維持 ---
  const mockEntriesPage = readFileSync(
    resolve(here, '../src/app/mock-timesheet/entries/page.tsx'),
    'utf8',
  )
  if (!mockEntriesPage.includes('scope="row"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1721 mock-entries body の <th scope="row"> が消えている',
    })
  }

  // --- 7. iter1720 reference invariant: description <td> title 維持 ---
  if (!mockEntriesPage.includes('title={e.description}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1720 mock-entries description <td> title={e.description} が消えている',
    })
  }

  // --- 8. iter1719 reference invariant: mock-login main aria-labelledby 維持 ---
  const mockLoginPage = readFileSync(
    resolve(here, '../src/app/mock-timesheet/login/page.tsx'),
    'utf8',
  )
  if (!mockLoginPage.includes('aria-labelledby="mock-login-heading"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1719 mock-login main aria-labelledby="mock-login-heading" が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — mock-top-nav session ID 表示が truncate + sr-only full + title hover で SR/sighted 情報量等価、iter1721 / iter1720 / iter1719 invariant 不変',
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
