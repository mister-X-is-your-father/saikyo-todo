/**
 * Phase 6.15 loop iter1805: offline page retry-button + home-link に title 付与
 * (iter1801 back-link / iter1803 auth cross-link と同 pattern を offline 復帰アクション
 * にも展開、offline page UX の sighted hover disclosure 完備)。
 *
 * 発見した UX gap (sighted only):
 *   - src/app/~offline/retry-button.tsx: aria-label のみ、no title
 *   - src/app/~offline/page.tsx offline-home-link: aria-label のみ、no title
 *   両 復帰アクション は visible "再読み込みして再試行" / "ホームに戻る" + aria-label で
 *   descriptive context を SR 提供だが sighted は hover で context 即把握できなかった。
 *
 * 修正 (2 file 各 1 line + 2 line comment 追加):
 *   両 要素 に `title={同 aria-label}` 付与。aria-label / href / className / data-testid
 *   完全不変、shadcn 編集なし、機能追加なし。
 *
 * 実行: pnpm tsx scripts/explore-uiux-offline-title-iter1805.ts
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

  const retryBtn = readFileSync(resolve(here, '../src/app/~offline/retry-button.tsx'), 'utf8')
  const offlinePage = readFileSync(resolve(here, '../src/app/~offline/page.tsx'), 'utf8')

  // --- 1. retry-button title 付与済 ---
  if (!retryBtn.includes('title="再読み込みして再試行 — ページ全体を読み直して接続を回復"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'offline retry-button title が無い',
    })
  }

  // --- 2. offline-home-link title 付与済 ---
  if (
    !offlinePage.includes(
      'title="ホームに戻る — アプリの起点画面に遷移、オンライン復帰後は最新状態を表示"',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'offline-home-link title が無い',
    })
  }

  // --- 3. retry-button data-testid 維持 ---
  if (!retryBtn.includes('data-testid="offline-retry-button"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'offline retry-button data-testid が消えている',
    })
  }

  // --- 4. offline-home-link data-testid 維持 ---
  if (!offlinePage.includes('data-testid="offline-home-link"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'offline-home-link data-testid が消えている',
    })
  }

  // --- 5. iter1803 auth cross-link title 維持 ---
  const loginPage = readFileSync(resolve(here, '../src/app/(auth)/login/page.tsx'), 'utf8')
  if (!loginPage.includes('title="サインアップ — アカウント未作成の方はこちらから新規登録"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1803 login/page signup-link title が消えている',
    })
  }

  // --- 6. iter1801 archive back-link title 維持 ---
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

  // --- 7. iter1799 create-workspace title 維持 ---
  const createWs = readFileSync(
    resolve(here, '../src/components/workspace/create-workspace-form.tsx'),
    'utf8',
  )
  if (
    !createWs.includes(
      "title={isPending ? '作成中… — Workspace を作成中' : '作成 — Workspace を新規作成'}",
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1799 create-workspace-submit title が消えている',
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
      '(なし) — offline retry-button + home-link に title 付与で offline page UX sighted hover disclosure、iter1803-1777 invariant 不変',
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
