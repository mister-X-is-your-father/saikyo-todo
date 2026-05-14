/**
 * Phase 6.15 loop iter855 — / (saikyo-todo workspace home) + /mock-timesheet/* の
 * 2 logout button visible "ログアウト" を aria-hidden span で wrap した regression guard。
 *
 * 背景: iter844-854 sweep で auth-like surface (login / signup / offline / mock-timesheet
 * login & submit) の visible aria-hidden 規約を統一済。本 iter は両 home / nav の
 * ログアウト button にも適用、auth context 終端 (logout) でも規約統一する。
 *
 * 両 button は既に aria-label に意図・遷移先を完全表現 ("ログアウトしてログイン画面に
 * 戻る" / "mock-timesheet session をログアウト") するのに visible 子 text のみ
 * aria-hidden 無し → AT 実装差で重複読み上げ可能性、iter844-854 と同 防御。
 *
 * 検証方針: 両 page とも auth gate 後でなければ render されないため Playwright 動的
 * navigate は login にリダイレクトされる。本 script は filesystem static grep verify
 * (iter854 同じアプローチ)。
 *
 *   pnpm tsx scripts/explore-uiux-logout-button-aria-hidden-iter855.ts
 *
 * supabase / login 不要 (静的 source 検査のみ)。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

interface Target {
  path: string
  label: string
  ariaLabel: string
}

const TARGETS: Target[] = [
  {
    path: 'src/app/page.tsx',
    label: 'saikyo-todo workspace home logout',
    ariaLabel: 'ログアウトしてログイン画面に戻る',
  },
  {
    path: 'src/components/mock-timesheet/mock-top-nav.tsx',
    label: 'mock-timesheet nav logout',
    ariaLabel: 'mock-timesheet session をログアウト',
  },
]

function main(): void {
  const findings: Finding[] = []
  for (const t of TARGETS) {
    const src = readFileSync(resolve(process.cwd(), t.path), 'utf8')

    // 1. aria-label を保持
    if (!src.includes(`aria-label="${t.ariaLabel}"`)) {
      findings.push({
        level: 'error',
        message: `${t.label}: aria-label="${t.ariaLabel}" が見つからない`,
      })
      continue
    }

    // 2. visible "ログアウト" が <span aria-hidden="true"> で wrap 済み
    const wrappedPattern = /<span aria-hidden="true">ログアウト<\/span>/
    if (!wrappedPattern.test(src)) {
      findings.push({
        level: 'error',
        message: `${t.label}: visible "ログアウト" が <span aria-hidden="true"> で wrap されていない`,
      })
    }

    // 3. wrap 前の raw `ログアウト` が </Button> 直前に残っていないか
    //    (= `>\n  ログアウト\n</Button>` のような raw 配置を検出)
    const rawPattern = /^\s*ログアウト\s*$/m
    // 文字列単独行は wrap 前の raw text のサイン (wrap 後は span に内包される)
    // wrap 済 case では visible "ログアウト" は span tag 内のみに存在し、単独行 raw
    // としては出現しない。
    if (rawPattern.test(src) && !wrappedPattern.test(src)) {
      findings.push({
        level: 'error',
        message: `${t.label}: visible "ログアウト" が raw のまま残っている`,
      })
    }
  }

  // 4. mock-top-nav の他 link (新規入力 / 入力一覧) は asChild で <Link> wrapping
  //    で visible text 経路、aria-hidden span は不要 (構造的に異なる)。invariant のみ
  //    確認: 該当 Button が消えていない。
  const mockNav = readFileSync(
    resolve(process.cwd(), 'src/components/mock-timesheet/mock-top-nav.tsx'),
    'utf8',
  )
  for (const l of ['新規入力', '入力一覧']) {
    if (!mockNav.includes(l)) {
      findings.push({ level: 'error', message: `mock-top-nav: <Link>${l}</Link> が消えている` })
    }
  }

  console.log(`\n=== Findings (logout-button-aria-hidden iter855) ===`)
  if (findings.length === 0) console.log('(なし) 期待どおり全 invariant OK (static grep verify)')
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  process.exit(findings.some((f) => f.level === 'error') ? 1 : 0)
}

main()
