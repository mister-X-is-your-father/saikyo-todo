/**
 * Phase 6.15 loop iter1807: notification-bell mark-all-read button に title 付与
 * (iter1791 submit / iter1789 comment-thread と同 pattern を mark-all-read にも展開、
 * notification action UX の sighted hover disclosure)。
 *
 * 発見した UX gap (sighted only):
 *   src/components/workspace/notification-bell.tsx line 203-225 の mark-all-read button は
 *   visible "全て既読" + aria-label conditional 3 path (unread=0 / pending / default) で
 *   未読件数 context を SR 提供だが、sighted は hover で context 即把握できなかった。
 *
 * 修正 (src/components/workspace/notification-bell.tsx, 6 line 追加 + 2 line comment 追加):
 *   <Button> に conditional `title={同 aria-label}` 付与。aria-label / disabled /
 *   data-testid / onClick / aria-busy 完全不変、shadcn 編集なし、機能追加なし。
 *
 * 実行: pnpm tsx scripts/explore-uiux-mark-all-read-title-iter1807.ts
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

  const bell = readFileSync(
    resolve(here, '../src/components/workspace/notification-bell.tsx'),
    'utf8',
  )

  // --- 1. mark-all-read 3 path text 維持 ---
  for (const t of [
    "'全て既読 — 未読通知がないため既読化不要'",
    '`全て既読 — 未読 ${unreadCount} 件を既読化中…`',
    '`全て既読 — 未読 ${unreadCount} 件をすべて既読にする`',
  ]) {
    if (!bell.includes(t)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `mark-all-read conditional path text ${t} が消えている`,
      })
    }
  }

  // --- 2. mark-all-read title 件数 = 2 (aria-label + title) ---
  // 厳密には bell には他 title=`通知 — 未読 ${unreadCount} 件` (iter1764) もあるので >= 2
  const titleCount = (bell.match(/\btitle=(\{|`)/g) ?? []).length
  if (titleCount < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `notification-bell title 件数が ${titleCount} (期待 >= 2: bell + mark-all-read)`,
    })
  }

  // --- 3. iter1764 notification-bell title 維持 ---
  if (!bell.includes('title={`通知 — 未読 ${unreadCount} 件`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1764 notification-bell title が消えている',
    })
  }

  // --- 4. data-testid="notification-mark-all-read" 維持 ---
  if (!bell.includes('data-testid="notification-mark-all-read"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'notification-mark-all-read data-testid が消えている',
    })
  }

  // --- 5. iter1805 offline retry title 維持 ---
  const retryBtn = readFileSync(resolve(here, '../src/app/~offline/retry-button.tsx'), 'utf8')
  if (!retryBtn.includes('title="再読み込みして再試行 — ページ全体を読み直して接続を回復"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1805 offline retry-button title が消えている',
    })
  }

  // --- 6. iter1803 auth cross-link title 維持 ---
  const loginPage = readFileSync(resolve(here, '../src/app/(auth)/login/page.tsx'), 'utf8')
  if (!loginPage.includes('title="サインアップ — アカウント未作成の方はこちらから新規登録"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1803 login/page signup-link title が消えている',
    })
  }

  // --- 7. iter1801 archive back-link title 維持 ---
  const archivePage = readFileSync(
    resolve(here, '../src/app/(workspace)/[workspaceId]/archive/page.tsx'),
    'utf8',
  )
  if (!archivePage.includes('title="Workspace dashboard に戻る"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1801 archive sub-page back title が消えている',
    })
  }

  // --- 8. iter1777 view-switcher Today title 維持 ---
  const board = readFileSync(resolve(here, '../src/components/workspace/items-board.tsx'), 'utf8')
  if (!board.includes('title="Today — 今日のタスク優先順、scheduledFor=今日 + 期限近接"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1777 view-switcher Today title が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — notification-bell mark-all-read button に title 付与で notification action UX sighted hover disclosure、iter1805-1777 invariant 不変',
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
