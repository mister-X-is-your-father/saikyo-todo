/**
 * Phase 6.15 loop iter 404 — skip-link target `<main id="main-content">` に
 * `tabIndex={-1}` を付与し、skip-link 起動時に main へ programmatic に focus
 * 移動可能にする (WCAG 2.4.1 Bypass Blocks の effective focus management)。
 *
 * 課題: iter389 で root layout に `<a href="#main-content">` skip-link を
 *   追加し、iter390-391 で各 page の `<main>` に id="main-content" を付与
 *   したが、`<main>` 要素は default で focusable でない (tabindex 無し)。
 *   skip-link 起動時:
 *   - browser は #main-content にスクロール (URL hash 更新)
 *   - **focus は main に移動しない** (main は focusable でないため、focus は
 *     body へ fall back)
 *   - 続く Tab 押下は body の最初の focusable (= skip-link 自身!) に戻る
 *   = skip-link が事実上機能していない (scroll はするが、keyboard navigation
 *   continuation が壊れている)。
 *
 *   `<main>` に `tabIndex={-1}` を追加することで:
 *   - element は keyboard tab 順には載らない (= -1)
 *   - **programmatic に focus 可能** に (= 0 や - 以上のときと同じ動作)
 *   - skip-link Enter 後、modern browser (Chrome 80+, Firefox 80+) は
 *     fragment target を auto-focus する (tabindex 付き要素が条件)
 *   - 続く Tab は main 内の最初の focusable (form input 等) に進む
 *   = skip-link が完全に機能する。
 *
 *   `focus-visible:outline-none` も同時に付与: tabindex={-1} 要素が focus
 *   されると default で focus ring が表示されるが、main は logical
 *   container で focus ring の意味がないため抑止 (skip-link の効果は
 *   focus 移動 + scroll で十分、視覚的 ring は不要)。
 *
 * fix: 5 file × 3-4 line 差替 (各 page の `<main>` に tabIndex={-1} +
 *   focus-visible:outline-none 追加、JSX が 1 行から複数行に展開)。
 *   - src/app/(auth)/layout.tsx (covers /login, /signup)
 *   - src/app/~offline/page.tsx
 *   - src/app/mock-timesheet/login/page.tsx
 *   - src/app/mock-timesheet/new/page.tsx
 *   - src/app/mock-timesheet/entries/page.tsx
 *
 *   workspace 配下 8 page (sprints / goals / pdca / workflows / time-entries
 *   / templates / integrations / archive / [workspaceId]/page.tsx の計 9 file)
 *   は次 iter で順次拡張予定 (iter391 と同 split pattern)。
 *
 * 機能追加なし、shadcn 編集なし、影響面 5 ファイル (iter391 / iter403 と同
 * horizontal expansion 形式)。視覚的 layout 不変。
 *
 * 検証: source-side regex assert で codify。dev server curl で `<main>`
 *   element に tabindex="-1" 属性が rendered HTML に出力されることを確認。
 *   MCP browser_evaluate で `main.focus()` 後 `document.activeElement === main`
 *   が true になることを直接確認。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

const TARGETS = [
  'src/app/(auth)/layout.tsx',
  'src/app/~offline/page.tsx',
  'src/app/mock-timesheet/login/page.tsx',
  'src/app/mock-timesheet/new/page.tsx',
  'src/app/mock-timesheet/entries/page.tsx',
]

async function main(): Promise<void> {
  const findings: Finding[] = []

  for (const path of TARGETS) {
    const src = readFileSync(resolve(process.cwd(), path), 'utf8')

    // <main> JSX block を取得 (id="main-content" を持つ)
    const mainMatch = src.match(/<main[\s\S]*?id="main-content"[\s\S]*?>/)
    if (!mainMatch) {
      findings.push({
        level: 'warning',
        message: `${path}: <main id="main-content"> block 不在`,
      })
      continue
    }
    const mainBlock = mainMatch[0]

    // tabIndex={-1}
    if (!/tabIndex=\{-1\}/.test(mainBlock)) {
      findings.push({
        level: 'warning',
        message: `${path}: <main> に tabIndex={-1} が無い`,
      })
    } else {
      findings.push({ level: 'info', message: `${path}: tabIndex={-1} OK` })
    }

    // focus-visible:outline-none (focus ring 抑止)
    if (!/focus-visible:outline-none/.test(mainBlock)) {
      findings.push({
        level: 'warning',
        message: `${path}: <main> に focus-visible:outline-none が無い`,
      })
    } else {
      findings.push({ level: 'info', message: `${path}: focus-visible:outline-none OK` })
    }
  }

  // iter389 invariant 維持: root layout に skip-link
  const layoutPath = 'src/app/layout.tsx'
  const layoutSrc = readFileSync(resolve(process.cwd(), layoutPath), 'utf8')
  if (!/<a[\s\S]*?href="#main-content"/.test(layoutSrc)) {
    findings.push({
      level: 'warning',
      message: `${layoutPath}: iter389 skip-link が消えた (regression)`,
    })
  } else {
    findings.push({ level: 'info', message: `iter389 skip-link 維持 OK` })
  }

  // iter390-391 invariant 維持: 各 target に id="main-content"
  for (const path of TARGETS) {
    const src = readFileSync(resolve(process.cwd(), path), 'utf8')
    if (!/id="main-content"/.test(src)) {
      findings.push({
        level: 'warning',
        message: `${path}: iter390-391 id="main-content" が消えた (regression)`,
      })
    }
  }

  console.log(`\n=== Findings (skip-link-tabindex-iter404) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
