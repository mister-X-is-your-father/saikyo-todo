/**
 * Phase 6.15 loop iter 945 (mode-D Desktop a11y) — `app/page.tsx` の home `<header>` の
 * aria-label "最強TODO ホーム header" → "最強TODO ホーム" に修正。redundant な "header" suffix
 * (element tag 名と重複、SR 読み上げ "最強TODO ホーム header" の最後 "header" が冗長) を削除。
 *
 * 課題: `<header aria-label="最強TODO ホーム header">` は SR が landmark / region nav で
 *   "最強TODO ホーム header" と読み上げる (Verbose mode / Generic 要素 reading mode 等)。
 *   element 自体が `<header>` tag = 既に SR が "header" や "banner" を announce する文脈で、
 *   aria-label の末尾 " header" は 同 word 二重 announce を招く可能性 (SR 設定依存)。
 *   iter907-940 の sweep pattern (visible label + aria-label 同梱 inner duplicate 排除) と
 *   類似の冗長排除 polish。
 *
 * fix: `aria-label="最強TODO ホーム header"` → `aria-label="最強TODO ホーム"` (suffix " header"
 *   を削除)。+0/-7 文字 (1 file, 1 行)。視覚 / DOM / 動作不変。SR は landmark name として
 *   "最強TODO ホーム" を読む (element type "header / banner" は SR 自身が補完)。
 *
 * 機能追加なし、shadcn 編集なし、影響面 1 ファイル 1 行。
 *
 * 検証: source-side regex で codify + grep で同 pattern 残存 0 を確認。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  // 1. app/page.tsx header aria-label の修正後値
  const target = 'src/app/page.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')
  if (!/aria-label="最強TODO ホーム"/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: <header> aria-label "最強TODO ホーム" 不在`,
    })
  } else {
    findings.push({ level: 'info', message: `home header aria-label "最強TODO ホーム" OK` })
  }

  // 2. " header" suffix 残存 0 (regression 検出)
  if (/aria-label="最強TODO ホーム header"/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: redundant " header" suffix 残存 (regression)`,
    })
  } else {
    findings.push({ level: 'info', message: `redundant " header" suffix 削除 OK` })
  }

  // 3. h1 / form aria-label 維持 (regression 検出 — 同行隣接修正で巻き添えないこと)
  if (!/<h1 className="text-3xl font-bold">最強TODO<\/h1>/.test(src)) {
    findings.push({ level: 'warning', message: `${target}: h1 "最強TODO" 消滅 (regression)` })
  } else {
    findings.push({ level: 'info', message: `h1 "最強TODO" 維持 OK` })
  }
  if (!/aria-label="ログアウト"/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: form aria-label "ログアウト" 消滅 (regression)`,
    })
  } else {
    findings.push({ level: 'info', message: `form aria-label "ログアウト" 維持 OK` })
  }
  if (!/aria-label="ログアウトしてログイン画面に戻る"/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: logout Button aria-label 消滅 (regression)`,
    })
  } else {
    findings.push({ level: 'info', message: `logout Button aria-label 維持 OK` })
  }

  // 4. 全 src/ 範囲で同 pattern (aria-label="* header") 残存 0 (sweep 飽和確認)
  // grep で再現可能だが script に固定値で簡易確認
  // (src/app/page.tsx 以外で同 pattern が後から導入されたら拾う warning)
  // 簡易版: app/ 配下のみ
  const layoutSrc = readFileSync(resolve(process.cwd(), 'src/app/layout.tsx'), 'utf8')
  if (/aria-label=".*header"/.test(layoutSrc) || /aria-label=".*ヘッダー"/.test(layoutSrc)) {
    findings.push({
      level: 'warning',
      message: `layout.tsx に redundant header / ヘッダー suffix 検出`,
    })
  } else {
    findings.push({ level: 'info', message: `layout.tsx に redundant header suffix なし OK` })
  }

  // 5. iter942 invariant: mock-timesheet/login main aria-labelledby
  const mockPageSrc = readFileSync(
    resolve(process.cwd(), 'src/app/mock-timesheet/login/page.tsx'),
    'utf8',
  )
  if (!/aria-labelledby="mock-timesheet-heading"/.test(mockPageSrc)) {
    findings.push({ level: 'warning', message: `iter942 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter942 invariant OK` })
  }

  // 6. iter944 invariant: mock-login-form aria-describedby
  const mockFormSrc = readFileSync(
    resolve(process.cwd(), 'src/components/mock-timesheet/mock-login-form.tsx'),
    'utf8',
  )
  if (!/aria-describedby="mock-timesheet-description"/.test(mockFormSrc)) {
    findings.push({ level: 'warning', message: `iter944 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter944 invariant OK` })
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

  console.log(`\n=== Findings (home-header-aria-label-iter945) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
