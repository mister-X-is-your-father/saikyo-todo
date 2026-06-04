/**
 * Phase 6.15 loop iter1764: notification-bell + notification-preferences icon-only button に
 * title 付与 (iter1763 theme-toggle 同 pattern を notification buttons にも展開、
 * icon-only button family の sighted hover disclosure 統一)。
 *
 * 発見した UX gap (sighted only):
 *   - notification-bell trigger Button (line 126+) は Bell icon-only で aria-label を持つが
 *     browser tooltip にならず sighted hover で何の button か即把握できなかった
 *   - notification-preferences trigger Button (line 112+) も同 gap (Settings icon-only)
 *
 * 修正 (2 file 各 2 line + 4 line comment ずつ):
 *   - notification-bell: <Button> に `title={同 aria-label}` 付与
 *   - notification-preferences: <Button> に `title={同 aria-label conditional}` 付与
 *   - aria-label / aria-expanded / aria-haspopup / className / data-testid 完全不変、
 *     shadcn 編集なし、機能追加なし
 *
 * 実行: pnpm tsx scripts/explore-uiux-notification-icon-title-iter1764.ts
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

  const notifBell = readFileSync(
    resolve(here, '../src/components/workspace/notification-bell.tsx'),
    'utf8',
  )
  const notifPrefs = readFileSync(
    resolve(here, '../src/components/workspace/notification-preferences.tsx'),
    'utf8',
  )

  // --- 1. notification-bell trigger に title 付与済 ---
  if (!notifBell.includes('title={`通知 — 未読 ${unreadCount} 件`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'notification-bell.tsx trigger Button に title が無い',
    })
  }

  // --- 2. notification-preferences trigger に conditional title 付与済 ---
  if (
    !notifPrefs.match(
      /title=\{\s*\n?\s*onCount !== null[\s\S]{0,300}'通知設定 — メール通知 4 種を ON\/OFF'\s*\n?\s*\}/,
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'notification-preferences.tsx trigger Button に conditional title が無い',
    })
  }

  // --- 3. notification-bell aria-label em-dash convention 維持 (iter1497) ---
  if (!notifBell.includes('aria-label={`通知 — 未読 ${unreadCount} 件`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'notification-bell.tsx aria-label em-dash convention が消えている',
    })
  }

  // --- 4. notification-preferences aria-label em-dash convention 維持 (iter1505) ---
  if (
    !notifPrefs.includes("'通知設定 — メール通知 4 種を ON/OFF'") ||
    !notifPrefs.includes('— メール通知 ${onCount}/${TOGGLES.length} 種 ON`')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'notification-preferences.tsx aria-label em-dash convention が消えている',
    })
  }

  // --- 5. iter1763 theme-toggle title 維持 ---
  const themeToggle = readFileSync(
    resolve(here, '../src/components/shared/theme-toggle.tsx'),
    'utf8',
  )
  if (
    !themeToggle.match(
      /title=\{\s*\n?\s*resolvedTheme === 'dark' \? 'ライトテーマに切替' : 'ダークテーマに切替'\s*\n?\s*\}/,
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1763 theme-toggle conditional title が消えている',
    })
  }

  // --- 6. iter1761 SeverityChip title 維持 ---
  const severityChip = readFileSync(
    resolve(here, '../src/components/shared/severity-chip.tsx'),
    'utf8',
  )
  const severityTitleCount = (severityChip.match(/title=\{ariaLabel \?\? label\}/g) ?? []).length
  if (severityTitleCount !== 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `iter1761 SeverityChip title 件数が ${severityTitleCount} (期待 2)`,
    })
  }

  // --- 7. iter1758 mock-login-seed 維持 ---
  const mockLoginForm = readFileSync(
    resolve(here, '../src/components/mock-timesheet/mock-login-form.tsx'),
    'utf8',
  )
  if (!mockLoginForm.includes('data-testid="mock-login-seed"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1758 mock-login-seed data-testid が消えている',
    })
  }

  // --- 8. iter1732 prefers-reduced-motion helper 維持 ---
  const helper = readFileSync(resolve(here, '../src/lib/ui/prefers-reduced-motion.ts'), 'utf8')
  if (!helper.includes('export function prefersReducedMotion')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1732 prefers-reduced-motion helper が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — notification-bell + notification-preferences icon-only button に title 付与で sighted hover disclosure、iter1763-1732 invariant 不変',
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
