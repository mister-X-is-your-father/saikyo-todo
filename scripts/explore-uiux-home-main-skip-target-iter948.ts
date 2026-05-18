/**
 * Phase 6.15 loop iter 948 (mode-D Desktop a11y) — app/page.tsx HomePage の `<main>` に
 * `tabIndex={-1}` + `focus-visible:outline-none` を付与し、skip-to-main link
 * (`<a href="#main-content">` in app/layout.tsx, iter389 で導入) の focus 移動 target を
 * 機能させる。
 *
 * 課題: layout.tsx の skip-link は `href="#main-content"` で id `main-content` を target
 *   とするが、HomePage の `<main id="main-content">` には `tabIndex={-1}` が無く、
 *   URL fragment scroll は機能するも focus 移動が機能しなかった (skip link 起動後 SR
 *   focus が main に移らない、SR ユーザは「飛ばした」ことを認識し難い)。
 *   他 page (~/offline / auth-layout / mock-timesheet/login/new/entries) は全て
 *   `tabIndex={-1}` + `focus-visible:outline-none` 既適用、HomePage だけ skip-target
 *   focus pattern 漏れの不整合状態。
 *
 * fix: app/page.tsx の <main> に `tabIndex={-1}` と `focus-visible:outline-none` を追加。
 *   +4/-1 行 (1 file, JSX 複数行展開分含む)。
 *   skip-link 起動時 → URL fragment scroll + 同時に main 要素に programmatic focus 移動 →
 *   SR announce "main 最強TODO ホーム" → keyboard nav が main 配下から開始可能。
 *   focus-visible:outline-none で skip 後の不要な focus 枠を抑制 (他 page 同 convention)。
 *
 * 機能追加なし、shadcn 編集なし、影響面 1 ファイル。
 *
 * 検証: source-side regex で codify。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const target = 'src/app/page.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  // 1. main に tabIndex={-1}
  if (!/<main[\s\S]*?id="main-content"[\s\S]*?tabIndex=\{-1\}[\s\S]*?>/.test(src)) {
    findings.push({ level: 'warning', message: `${target}: main に tabIndex={-1} 不在` })
  } else {
    findings.push({ level: 'info', message: `main tabIndex={-1} OK` })
  }

  // 2. focus-visible:outline-none class
  if (!/focus-visible:outline-none/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: focus-visible:outline-none class 不在`,
    })
  } else {
    findings.push({ level: 'info', message: `focus-visible:outline-none OK` })
  }

  // 3. id="main-content" 維持 (skip-link target)
  if (!/id="main-content"/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: id="main-content" 消滅 (regression、skip-link target が dangling)`,
    })
  } else {
    findings.push({ level: 'info', message: `main id="main-content" 維持 OK` })
  }

  // 4. iter389 invariant: layout.tsx skip-link
  const layoutSrc = readFileSync(resolve(process.cwd(), 'src/app/layout.tsx'), 'utf8')
  if (!/href="#main-content"/.test(layoutSrc)) {
    findings.push({
      level: 'warning',
      message: `iter389 invariant: layout.tsx skip-link 破壊`,
    })
  } else {
    findings.push({ level: 'info', message: `iter389 invariant (skip-link) OK` })
  }

  // 5. iter945 invariant: home header aria-label (同 file 修正で巻き添えないこと)
  if (!/aria-label="最強TODO ホーム"/.test(src)) {
    findings.push({ level: 'warning', message: `iter945 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter945 invariant OK` })
  }

  // 6. iter946/947 invariant: mock-timesheet/entries + new main aria-label*
  const entriesSrc = readFileSync(
    resolve(process.cwd(), 'src/app/mock-timesheet/entries/page.tsx'),
    'utf8',
  )
  if (!/aria-labelledby="mock-entries-heading"/.test(entriesSrc)) {
    findings.push({ level: 'warning', message: `iter946 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter946 invariant OK` })
  }
  const newSrc = readFileSync(resolve(process.cwd(), 'src/app/mock-timesheet/new/page.tsx'), 'utf8')
  if (!/aria-label="Mock Timesheet 新規送信"/.test(newSrc)) {
    findings.push({ level: 'warning', message: `iter947 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter947 invariant OK` })
  }

  // 7. iter735 invariant
  const tce = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  const tceMatches = tce.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tceMatches.length >= 2) {
    findings.push({ level: 'info', message: `iter735 invariant OK (${tceMatches.length} 箇所)` })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant 破壊` })
  }

  console.log(`\n=== Findings (home-main-skip-target-iter948) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
