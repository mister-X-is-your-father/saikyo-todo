/**
 * Phase 6.15 loop iter854 — /mock-timesheet/new の MockSubmitForm submit button visible
 * "送信"/"送信中..." を aria-hidden span で wrap した regression guard。
 *
 * 背景: iter844-853 で確立した「aria-label が完全 content を含む button は visible 子
 * text を <span aria-hidden="true"> で wrap し aria-label 単独経路にする」 pattern を
 * mock-timesheet 工数送信 form (auth gate 後の唯一の form button) にも展開し、
 * mock-timesheet cross-system surface 内 button (login submit + 工数送信 submit) で
 * visible aria-hidden 規約を統一する。
 *
 * 検証方針: /mock-timesheet/new は mock auth gate 後でなければ render されないため、
 * Playwright で動的 navigate しても /mock-timesheet/login にリダイレクトされる。
 * 本 script は filesystem 読み取りで static invariant を verify する (grep ベース)。
 *
 *   pnpm tsx scripts/explore-uiux-mock-timesheet-submit-aria-hidden-iter854.ts
 *
 * supabase / login 不要 (静的 source 検査のみ)。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

const FORM_PATH = resolve(process.cwd(), 'src/components/mock-timesheet/mock-submit-form.tsx')

async function main(): Promise<void> {
  const findings: Finding[] = []
  const src = readFileSync(FORM_PATH, 'utf8')

  // 1. submit button が aria-label 2 状態 (idle / pending) を完全保持
  const hasIdleAria = src.includes("'工数を送信 (mock-timesheet 入力フォーム)'")
  const hasPendingAria = src.includes("'送信中… (mock-timesheet 工数送信処理を実行中)'")
  if (!hasIdleAria) {
    findings.push({
      level: 'error',
      message: 'submit idle aria-label "工数を送信 (...)" が見つからない',
    })
  }
  if (!hasPendingAria) {
    findings.push({
      level: 'error',
      message: 'submit pending aria-label "送信中… (...)" が見つからない',
    })
  }

  // 2. submit button の visible 子 text が aria-hidden span で wrap 済み
  const ariaHiddenSpanPattern =
    /<span aria-hidden="true">\{isPending \? '送信中\.\.\.' : '送信'\}<\/span>/
  if (!ariaHiddenSpanPattern.test(src)) {
    findings.push({
      level: 'error',
      message:
        "submit 子 visible text が <span aria-hidden=\"true\">{isPending ? '送信中...' : '送信'}</span> で wrap されていない",
    })
  }

  // 3. wrap 前の raw `{isPending ? '送信中...' : '送信'}` が <Button> 直下に残っていないか
  const rawPattern = /\n\s*\{isPending \? '送信中\.\.\.' : '送信'\}\n\s*<\/Button>/
  if (rawPattern.test(src)) {
    findings.push({
      level: 'error',
      message: 'submit 子 visible text が aria-hidden span で wrap されず raw のまま残っている',
    })
  }

  // 4. form aria-label invariant 健在
  if (!src.includes('aria-label="Mock Timesheet 工数送信フォーム"')) {
    findings.push({
      level: 'error',
      message:
        'form aria-label="Mock Timesheet 工数送信フォーム" が消えている (iter444 等の invariant)',
    })
  }

  // 5. button id="tsSubmit" 健在 (E2E test identifier)
  if (!src.includes('id="tsSubmit"')) {
    findings.push({
      level: 'error',
      message: 'submit button id="tsSubmit" 健在性 NG (E2E identifier)',
    })
  }

  // 6. iter444 invariant: last-ref live region 健在
  if (!src.includes('role="status"') || !src.includes('aria-live="polite"')) {
    findings.push({
      level: 'error',
      message: 'last-ref live region (role="status" aria-live="polite") が消えている (iter444)',
    })
  }

  console.log(`\n=== Findings (mock-timesheet-submit-aria-hidden iter854) ===`)
  if (findings.length === 0) console.log('(なし) 期待どおり全 invariant OK (static grep verify)')
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  process.exit(findings.some((f) => f.level === 'error') ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
