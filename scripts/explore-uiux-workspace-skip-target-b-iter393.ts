/**
 * Phase 6.15 loop iter 393 — workspace 配下 残 4 page (workflows / integrations /
 * time-entries / archive) の `<main>` に id="main-content" を付与 (iter389-392
 * skip-link target 完成、最終弾)。
 *
 * 課題: iter392 で workspace 4 page (sprints / goals / pdca / templates) を
 *   片付けたが、残 4 page (workflows / integrations / time-entries / archive) は
 *   id 不在で skip-link が無効。
 *
 * fix: 4 file × 1 line addition で `<main id="main-content">` を付与
 *   (機能追加なし、shadcn 編集なし)。これで codebase 全 page (root layout +
 *   auth layout + offline + workspace home + workspace 8 page +
 *   mock-timesheet 3 page = 計 13 file 14 page) の skip-link target が完成、
 *   keyboard user は全 page で Tab 1 回 + Enter で main 直行可能。
 *
 * 検証: source-side regex assert で codify。全 14 file の <main id> + iter389
 *   skip-link を 1 関数で確認。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  // 1. workspace 残 4 page
  for (const f of [
    'src/app/(workspace)/[workspaceId]/workflows/page.tsx',
    'src/app/(workspace)/[workspaceId]/integrations/page.tsx',
    'src/app/(workspace)/[workspaceId]/time-entries/page.tsx',
    'src/app/(workspace)/[workspaceId]/archive/page.tsx',
  ]) {
    const s = readFileSync(resolve(process.cwd(), f), 'utf8')
    if (!/<main\s+id="main-content"/.test(s)) {
      findings.push({ level: 'warning', message: `${f}: <main id="main-content"> が無い` })
    } else {
      findings.push({ level: 'info', message: `${f}: OK` })
    }
  }

  // 2. iter389 layout skip-link
  const layoutSrc = readFileSync(resolve(process.cwd(), 'src/app/layout.tsx'), 'utf8')
  if (!/<a\s+href="#main-content"[\s\S]*?メインコンテンツへスキップ/.test(layoutSrc)) {
    findings.push({
      level: 'warning',
      message: 'src/app/layout.tsx: iter389 skip-link が消えた',
    })
  }

  // 3. iter389-392 既存 <main id> 維持
  for (const f of [
    'src/app/(auth)/layout.tsx',
    'src/app/~offline/page.tsx',
    'src/app/(workspace)/[workspaceId]/page.tsx',
    'src/app/mock-timesheet/login/page.tsx',
    'src/app/mock-timesheet/new/page.tsx',
    'src/app/mock-timesheet/entries/page.tsx',
    'src/app/(workspace)/[workspaceId]/sprints/page.tsx',
    'src/app/(workspace)/[workspaceId]/goals/page.tsx',
    'src/app/(workspace)/[workspaceId]/pdca/page.tsx',
    'src/app/(workspace)/[workspaceId]/templates/page.tsx',
  ]) {
    const s = readFileSync(resolve(process.cwd(), f), 'utf8')
    if (!/<main\s+id="main-content"/.test(s)) {
      findings.push({
        level: 'warning',
        message: `${f}: iter389-392 <main id> 消えた (regression)`,
      })
    }
  }

  console.log(`\n=== Findings (workspace-skip-target-b-iter393) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
