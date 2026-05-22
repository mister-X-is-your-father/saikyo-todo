/**
 * Phase 6.15 loop iter1091: Loading component default + dashboard-view 2 caller の visible "..."
 * → U+2026 '…' 統一の regression guard。
 *
 * iter1090 までの sweep は visible vs aria-label の WCAG 2.5.3 違反箇所のみだったが、Loading は
 * role="status" 経路で visible テキスト = SR テキストのため WCAG 違反では無い (divergence 無し)。
 * ただし codebase convention (login-form / signup-form / mock-* / quick-add / create-time-entry-form
 * 全て U+2026) と一致させて consistency 確保。
 *
 * 修正対象:
 *   - src/components/shared/async-states.tsx:13 default '読み込み中...' → '読み込み中…'
 *   - src/components/workspace/dashboard-view.tsx:843 'ダッシュボード読込中...' → '…'
 *   - src/components/workspace/dashboard-view.tsx:1330 'グラフ読込中...' → '…'
 *
 * 本 script は source 直読で ASCII '...' 不在 + U+2026 '…' 存在を assert。Loading は workspace
 * context 必要 page 多数で使われ Docker 不在 mode で browser 観察不能のため fallback。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-loading-message-ellipsis-iter1091.ts
 * 前提: なし (filesystem 読み込みのみ)
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

  const asyncStatesPath = resolve(here, '../src/components/shared/async-states.tsx')
  const asyncStates = readFileSync(asyncStatesPath, 'utf8')
  if (asyncStates.includes("message = '読み込み中...'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `async-states.tsx の Loading default '読み込み中...' (ASCII) が残存 — '読み込み中…' (U+2026) に統一されているはず`,
    })
  }
  if (!asyncStates.includes("message = '読み込み中…'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `async-states.tsx の Loading default '読み込み中…' (U+2026) が消失`,
    })
  }

  const dashPath = resolve(here, '../src/components/workspace/dashboard-view.tsx')
  const dash = readFileSync(dashPath, 'utf8')
  for (const bad of ['ダッシュボード読込中...', 'グラフ読込中...']) {
    if (dash.includes(bad)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `dashboard-view.tsx に ASCII '${bad}' が残存`,
      })
    }
  }
  for (const good of ['ダッシュボード読込中…', 'グラフ読込中…']) {
    if (!dash.includes(good)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `dashboard-view.tsx の U+2026 '${good}' が消失`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — Loading 系 3 箇所 全て U+2026 統一済')
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
