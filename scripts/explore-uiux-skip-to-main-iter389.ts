/**
 * Phase 6.15 loop iter 389 — keyboard user 用 skip-to-main link を root layout に
 * 追加 + workspace 主 page の <main> に id="main-content" を付与 (WCAG 2.4.1
 * Bypass Blocks)。
 *
 * 課題: 旧 codebase は skip-to-main link 不在。keyboard user (Tab navigation のみ)
 *   は header / nav / utility 群を毎 page 全部 Tab で skip しないと <main> 内の
 *   操作ターゲットに到達できない (例: workspace home で 12 nav button + 3 utility
 *   button = 15 tab 押下が毎回必要)。WCAG 2.4.1 Bypass Blocks 違反。
 *
 * fix: src/app/layout.tsx に skip-link を <body> 直下に追加 (sr-only default、
 *   focus 時のみ可視化、`href="#main-content"`)。+ src/app/(workspace)/[workspaceId]/page.tsx
 *   の <main> に id="main-content" を付与。
 *
 * 機能追加なし、shadcn 編集なし、影響面 2 ファイル (合計 約 12 line 差替)。
 * 他 page (auth / mock-timesheet / offline / 他 workspace 配下) も次 iter で
 * 順次 id="main-content" を付与する予定。
 *
 * UX 卓越: (a) 状態可視化 — keyboard user 1 操作で main に到達。(d)
 * キーボード優先 — Tab 1 回で skip-link が focus、Enter で main 直行。
 *
 * 検証: source-side regex assert + dev server curl で skip link rendered HTML
 *   出力を確認。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  // 1. layout.tsx に skip link
  const layoutSrc = readFileSync(resolve(process.cwd(), 'src/app/layout.tsx'), 'utf8')
  if (!/<a\s+href="#main-content"[\s\S]*?メインコンテンツへスキップ[\s\S]*?<\/a>/.test(layoutSrc)) {
    findings.push({
      level: 'warning',
      message: 'src/app/layout.tsx: skip-to-main <a href="#main-content"> link が無い',
    })
  } else {
    findings.push({ level: 'info', message: 'layout.tsx skip-link OK' })
  }
  if (!/sr-only[\s\S]*?focus:not-sr-only/.test(layoutSrc)) {
    findings.push({
      level: 'warning',
      message: 'src/app/layout.tsx: skip-link が sr-only + focus:not-sr-only pattern でない',
    })
  }

  // 2. workspace home page の <main id="main-content">
  const wsPageSrc = readFileSync(
    resolve(process.cwd(), 'src/app/(workspace)/[workspaceId]/page.tsx'),
    'utf8',
  )
  if (!/<main id="main-content"/.test(wsPageSrc)) {
    findings.push({
      level: 'warning',
      message: 'workspace home page の <main> に id="main-content" が無い',
    })
  } else {
    findings.push({ level: 'info', message: 'workspace home <main id> OK' })
  }

  // 3. iter378-388 invariant 維持 (regression guard、重要 file のみ pick)
  for (const f of [
    'src/components/workspace/dashboard-view.tsx',
    'src/components/workspace/today-view.tsx',
    'src/components/workspace/sprints-panel.tsx',
    'src/components/workspace/pdca-panel.tsx',
    'src/components/workflow/workflows-panel.tsx',
  ]) {
    const s = readFileSync(resolve(process.cwd(), f), 'utf8')
    if (
      f.endsWith('dashboard-view.tsx') &&
      !/<time dateTime=\{item\.dueDate\}>\{item\.dueDate\}<\/time>/.test(s)
    ) {
      findings.push({ level: 'warning', message: `${f}: iter387 dashboard <time> 消えた` })
    }
    if (f.endsWith('today-view.tsx') && !/<time dateTime=\{it\.dueDate\}>/.test(s)) {
      findings.push({ level: 'warning', message: `${f}: iter386 today <time> 消えた` })
    }
    if (f.endsWith('sprints-panel.tsx') && !/<time dateTime=\{sprint\.startDate\}>/.test(s)) {
      findings.push({ level: 'warning', message: `${f}: iter385 sprint <time> 消えた` })
    }
    if (
      f.endsWith('pdca-panel.tsx') &&
      !/<time dateTime=\{first\}>\{first\.slice\(5\)\}<\/time>/.test(s)
    ) {
      findings.push({ level: 'warning', message: `${f}: iter388 pdca chart <time> 消えた` })
    }
    if (
      f.endsWith('workflows-panel.tsx') &&
      !/id=\{`wf-editor-error-\$\{wf\.id\}`\}[\s\S]*?role="alert"/.test(s)
    ) {
      findings.push({ level: 'warning', message: `${f}: iter383 workflow inline error 消えた` })
    }
  }

  console.log(`\n=== Findings (skip-to-main-iter389) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
