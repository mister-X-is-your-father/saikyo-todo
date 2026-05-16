/**
 * Phase 6.15 loop iter 856 (mode-D Desktop a11y) —
 * mock-timesheet 3 file (top-nav / login-form / submit-form):
 * Submit / ログアウト button visible text を aria-hidden span で wrap (一括)。
 *
 * 課題: src/components/mock-timesheet/ は Playwright E2E test の対象 mock 外部
 *   システム (saikyo-todo とは独立) だが、本物の UI と同様の a11y 規約を適用する
 *   ことで、E2E test の SR-aware アクセス path を確保する。3 button いずれも
 *   aria-label が完全 content を含むのに visible text は aria-hidden 無し →
 *   SR ユーザは aria-label を聞いた後、visible text も別途読み上げされる重複:
 *     1. mock-top-nav ログアウト button
 *     2. mock-login-form ログイン Submit button
 *     3. mock-submit-form 送信 Submit button
 *
 * fix (3 ファイル ~3 spot):
 *   - 各 visible text を <span aria-hidden="true"> で wrap
 *   - aria-label 単独経路に統一、機能不変、視覚 layout 不変、shadcn 編集なし
 *   - iter800-855 sweep の続編 (mock-timesheet family に展開)
 *
 * 検証: source-side regex assert + iter735/854/855 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  // 1. mock-top-nav ログアウト button
  const tn = readFileSync(
    resolve(process.cwd(), 'src/components/mock-timesheet/mock-top-nav.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">ログアウト<\/span>/.test(tn)) {
    findings.push({
      level: 'info',
      message: `mock-top-nav ログアウト button visible aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `mock-top-nav ログアウト button visible aria-hidden 未統合`,
    })
  }
  if (/aria-label="mock-timesheet session をログアウト"/.test(tn)) {
    findings.push({
      level: 'info',
      message: `mock-top-nav ログアウト aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `mock-top-nav aria-label 破壊` })
  }

  // 2. mock-login-form Submit button
  const lf = readFileSync(
    resolve(process.cwd(), 'src/components/mock-timesheet/mock-login-form.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{isPending \? '認証中\.\.\.' : 'ログイン'\}<\/span>/.test(lf)) {
    findings.push({
      level: 'info',
      message: `mock-login-form Submit button visible aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `mock-login-form Submit button visible aria-hidden 未統合`,
    })
  }
  if (
    /aria-label=\{[\s\S]+?'ログイン \(mock-timesheet email \+ password で認証\)'/.test(lf) &&
    /aria-label=\{[\s\S]+?'認証中… \(mock-timesheet 認証処理を実行中\)'/.test(lf)
  ) {
    findings.push({
      level: 'info',
      message: `mock-login-form aria-label (active + pending) 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `mock-login-form aria-label 破壊` })
  }

  // 3. mock-submit-form Submit button
  const sf = readFileSync(
    resolve(process.cwd(), 'src/components/mock-timesheet/mock-submit-form.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{isPending \? '送信中\.\.\.' : '送信'\}<\/span>/.test(sf)) {
    findings.push({
      level: 'info',
      message: `mock-submit-form Submit button visible aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `mock-submit-form Submit button visible aria-hidden 未統合`,
    })
  }
  if (
    /aria-label=\{[\s\S]+?'工数を送信 \(mock-timesheet 入力フォーム\)'/.test(sf) &&
    /aria-label=\{[\s\S]+?'送信中… \(mock-timesheet 工数送信処理を実行中\)'/.test(sf)
  ) {
    findings.push({
      level: 'info',
      message: `mock-submit-form aria-label (active + pending) 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `mock-submit-form aria-label 破壊` })
  }

  // 4. data-testid 維持 (3 file)
  if (/id="tsLoginSubmit"/.test(lf) && /id="tsSubmit"/.test(sf)) {
    findings.push({
      level: 'info',
      message: `mock-timesheet form id (tsLoginSubmit / tsSubmit) 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `mock-timesheet form id 破壊` })
  }

  // iter855 invariant: integrations-panel visible aria-hidden
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">履歴<\/span>/.test(ip)) {
    findings.push({
      level: 'info',
      message: `iter855 invariant: integrations-panel 履歴 aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter855 invariant: 破壊` })
  }

  // iter854 invariant: operation-board-widget visible aria-hidden
  const obw = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">昨日 done \{board\.doneYesterday\.count\} 件<\/span>/.test(obw)) {
    findings.push({
      level: 'info',
      message: `iter854 invariant: operation-board 昨日 done aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter854 invariant: 破壊` })
  }

  // iter735 invariant: team-context-editor aria-keyshortcuts
  const tce = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  const tceMatches = tce.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tceMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter735 invariant: team-context-editor aria-keyshortcuts 維持 OK (${tceMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant: 破壊` })
  }

  console.log(`\n=== Findings (mock-timesheet-aria-hidden-iter856) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
