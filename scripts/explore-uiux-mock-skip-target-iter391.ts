/**
 * Phase 6.15 loop iter 391 — mock-timesheet 3 page (login / new / entries) の
 * `<main>` に id="main-content" を付与 (iter389-390 skip-link target 拡張)。
 *
 * 課題: iter389/390 で root layout に skip-link を追加し auth/offline/workspace
 *   home の `<main>` に id を付与したが、mock-timesheet 3 page (login / new /
 *   entries) の `<main>` は id 不在で skip-link が graceful degradation で
 *   無効化されていた。
 *
 * fix: 3 file × 1 line addition (機能追加なし、shadcn 編集なし)。
 *   - src/app/mock-timesheet/login/page.tsx の `<main>` に id="main-content"
 *   - src/app/mock-timesheet/new/page.tsx の `<main>` に id="main-content"
 *   - src/app/mock-timesheet/entries/page.tsx の `<main>` に id="main-content"
 *
 * 残 page (workspace 配下 8 page) は次 iter で順次。
 *
 * 検証: source-side regex assert で codify。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  for (const f of [
    'src/app/mock-timesheet/login/page.tsx',
    'src/app/mock-timesheet/new/page.tsx',
    'src/app/mock-timesheet/entries/page.tsx',
  ]) {
    const s = readFileSync(resolve(process.cwd(), f), 'utf8')
    if (!/<main\s+id="main-content"/.test(s)) {
      findings.push({
        level: 'warning',
        message: `${f}: <main id="main-content"> が無い`,
      })
    } else {
      findings.push({ level: 'info', message: `${f}: <main id> OK` })
    }
  }

  // iter389 / iter390 invariant 維持
  const layoutSrc = readFileSync(resolve(process.cwd(), 'src/app/layout.tsx'), 'utf8')
  if (!/<a\s+href="#main-content"[\s\S]*?メインコンテンツへスキップ/.test(layoutSrc)) {
    findings.push({
      level: 'warning',
      message: 'src/app/layout.tsx: iter389 skip-link が消えた (regression)',
    })
  }
  for (const f of [
    'src/app/(auth)/layout.tsx',
    'src/app/~offline/page.tsx',
    'src/app/(workspace)/[workspaceId]/page.tsx',
  ]) {
    const s = readFileSync(resolve(process.cwd(), f), 'utf8')
    if (!/<main\s+id="main-content"/.test(s)) {
      findings.push({
        level: 'warning',
        message: `${f}: iter389/390 <main id> 消えた (regression)`,
      })
    }
  }

  console.log(`\n=== Findings (mock-skip-target-iter391) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
