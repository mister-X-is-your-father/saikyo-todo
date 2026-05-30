/**
 * Phase 6.15 loop iter1492: ~offline/page.tsx + retry-button.tsx aria-label em-dash
 * convention 統一 (regression guard)。
 *
 * 経緯: iter1093-1151 sweep で codebase 全体の visible-prefix button / link aria-label を
 * em-dash 区切に統一済だが、PWA offline fallback (~offline) は trigger 機会が稀で
 * sweep からこぼれ、`'再読み込みして再試行 (ページ全体を読み直して接続を回復)'` と
 * `'ホームに戻る (アプリの起点画面に遷移、オンライン復帰後は最新状態を表示)'` の 2 件で
 * 旧 () 区切が残存していた。
 *
 * 修正:
 *   retry-button.tsx aria-label:
 *     '再読み込みして再試行 (ページ全体を読み直して接続を回復)'
 *   → '再読み込みして再試行 — ページ全体を読み直して接続を回復'
 *
 *   ~offline/page.tsx Link aria-label:
 *     'ホームに戻る (アプリの起点画面に遷移、オンライン復帰後は最新状態を表示)'
 *   → 'ホームに戻る — アプリの起点画面に遷移、オンライン復帰後は最新状態を表示'
 *
 * visible span は無変更 ('再読み込みして再試行' / 'ホームに戻る')、voice control の
 * prefix-matching は影響なし。SR 区切が codebase 他 button / link の em-dash と一致し
 * 認識コスト下がる。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-offline-page-em-dash-iter1492.ts
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
  const retryPath = resolve(here, '../src/app/~offline/retry-button.tsx')
  const pagePath = resolve(here, '../src/app/~offline/page.tsx')
  const retrySrc = readFileSync(retryPath, 'utf8')
  const pageSrc = readFileSync(pagePath, 'utf8')

  // 1. retry button — em-dash 新形式
  if (!retrySrc.includes('aria-label="再読み込みして再試行 — ページ全体を読み直して接続を回復"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'retry-button aria-label が em-dash 形式 "再読み込みして再試行 — ..." でない',
    })
  }
  // 1b. 旧 () 形式残存
  if (retrySrc.includes('aria-label="再読み込みして再試行 (ページ全体を読み直して接続を回復)"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'retry-button 旧 () 区切 aria-label が残存',
    })
  }
  // 1c. visible span 維持
  if (!retrySrc.includes('<span aria-hidden="true">再読み込みして再試行</span>')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'retry-button visible span "再読み込みして再試行" が消えている',
    })
  }

  // 2. ホームに戻る Link — em-dash 新形式
  if (
    !pageSrc.includes(
      'aria-label="ホームに戻る — アプリの起点画面に遷移、オンライン復帰後は最新状態を表示"',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '~offline/page.tsx ホームに戻る Link aria-label が em-dash 形式でない',
    })
  }
  // 2b. 旧 () 形式残存
  if (
    pageSrc.includes(
      'aria-label="ホームに戻る (アプリの起点画面に遷移、オンライン復帰後は最新状態を表示)"',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '~offline/page.tsx ホームに戻る Link 旧 () 区切 aria-label が残存',
    })
  }
  // 2c. visible span 維持
  if (!pageSrc.includes('<span aria-hidden="true">ホームに戻る</span>')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '~offline/page.tsx ホームに戻る Link visible span が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — ~offline retry-button / ホームに戻る Link aria-label が em-dash convention 統一済',
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
