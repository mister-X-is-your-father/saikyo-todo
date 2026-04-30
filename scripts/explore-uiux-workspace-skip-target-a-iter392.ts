/**
 * Phase 6.15 loop iter 392 — workspace 配下 4 page (sprints / goals / pdca /
 * templates) の `<main>` に id="main-content" を付与 (iter389-391 skip-link
 * target 拡張、第 4 弾)。
 *
 * 課題: iter389-391 で skip-link を追加し root layout / auth / offline /
 *   workspace home / mock-timesheet 3 page の `<main>` に id を付与したが、
 *   workspace 配下 8 page の残 4 page (workflows / integrations / time-entries /
 *   archive) を含め 8 page で id 不在で skip-link が無効。本 iter で 4 page
 *   (sprints / goals / pdca / templates) を片付け、次 iter で残 4 page。
 *
 * fix: 4 file × 1 line addition (機能追加なし、shadcn 編集なし)。
 *   - sprints/page.tsx の `<main>` に id="main-content"
 *   - goals/page.tsx の `<main>` に id="main-content"
 *   - pdca/page.tsx の `<main>` に id="main-content"
 *   - templates/page.tsx の `<main>` に id="main-content"
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
    'src/app/(workspace)/[workspaceId]/sprints/page.tsx',
    'src/app/(workspace)/[workspaceId]/goals/page.tsx',
    'src/app/(workspace)/[workspaceId]/pdca/page.tsx',
    'src/app/(workspace)/[workspaceId]/templates/page.tsx',
  ]) {
    const s = readFileSync(resolve(process.cwd(), f), 'utf8')
    if (!/<main\s+id="main-content"/.test(s)) {
      findings.push({ level: 'warning', message: `${f}: <main id="main-content"> が無い` })
    } else {
      findings.push({ level: 'info', message: `${f}: OK` })
    }
  }

  // iter389-391 invariant 維持
  for (const f of [
    'src/app/layout.tsx',
    'src/app/(auth)/layout.tsx',
    'src/app/~offline/page.tsx',
    'src/app/(workspace)/[workspaceId]/page.tsx',
    'src/app/mock-timesheet/login/page.tsx',
    'src/app/mock-timesheet/new/page.tsx',
    'src/app/mock-timesheet/entries/page.tsx',
  ]) {
    const s = readFileSync(resolve(process.cwd(), f), 'utf8')
    if (
      f === 'src/app/layout.tsx' &&
      !/<a\s+href="#main-content"[\s\S]*?メインコンテンツへスキップ/.test(s)
    ) {
      findings.push({ level: 'warning', message: `${f}: iter389 skip-link が消えた` })
    }
    if (f !== 'src/app/layout.tsx' && !/<main\s+id="main-content"/.test(s)) {
      findings.push({
        level: 'warning',
        message: `${f}: iter389-391 <main id> が消えた (regression)`,
      })
    }
  }

  console.log(`\n=== Findings (workspace-skip-target-a-iter392) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
