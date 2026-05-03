/**
 * Phase 6.15 loop iter 657 (mode-D Desktop a11y) —
 * sub-page (goals / pdca / templates / integrations / sprints / workflows /
 * archive / time-entries) の "← Workspace" 戻り link の `←` arrow を
 * aria-hidden 化 (SR が "leftwards arrow Workspace" 重複読み上げ抑止)。
 *
 * 課題: 8 sub-page (page.tsx 行 50) の `<Link>← Workspace</Link>` は visible text
 *   "← Workspace" を SR が「leftwards arrow Workspace」と読み上げ、leftwards arrow
 *   は decorative (link は href で workspace home へ戻る context 既に conveyed) なので
 *   SR には冗長。workspace home page (`/[workspaceId]/page.tsx` 行 91) では既に
 *   `<span aria-hidden="true">← </span>一覧` で wrap 済みだったので、その pattern を
 *   8 sub-page に統一展開。
 *
 * fix (8 ファイル ~24 行差分、各 file +3/-1 行):
 *   - `← Workspace` → `<span aria-hidden="true">← </span>Workspace`
 *   - prettier 整形で 1 行 → 3 行折返し
 *
 * 検証: source-side regex assert + iter515-656 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

const SUB_PAGES = [
  'goals',
  'pdca',
  'templates',
  'integrations',
  'sprints',
  'workflows',
  'archive',
  'time-entries',
] as const

async function main(): Promise<void> {
  const findings: Finding[] = []

  for (const page of SUB_PAGES) {
    const f = readFileSync(
      resolve(process.cwd(), `src/app/(workspace)/[workspaceId]/${page}/page.tsx`),
      'utf8',
    )
    // 1. arrow が aria-hidden で wrap されている
    if (/<span aria-hidden="true">← <\/span>Workspace/.test(f)) {
      findings.push({ level: 'info', message: `${page} ← arrow aria-hidden OK` })
    } else {
      findings.push({ level: 'warning', message: `${page} ← arrow aria-hidden なし` })
    }
    // 2. 旧の生 `← Workspace` 残ってない
    if (/>← Workspace<\/Link>/.test(f)) {
      findings.push({ level: 'warning', message: `${page} 生 ← Workspace 残存` })
    }
  }

  // 3. iter656 invariant: decompose-proposals motion-safe 維持
  const dp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (/isAgentRunning \? 'motion-safe:animate-pulse' : ''/.test(dp)) {
    findings.push({
      level: 'info',
      message: `iter656 invariant: decompose pulse motion-safe 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter656 invariant: 破壊` })
  }

  // 4. iter655 invariant: subtasks-panel overDepth ⚠ 維持
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/subtasks-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">⚠ <\/span>深さ \{MAX_TREE_DEPTH\}/.test(sp)) {
    findings.push({ level: 'info', message: `iter655 invariant: subtasks overDepth ⚠ 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter655 invariant: 破壊` })
  }

  // 5. workspace home の `← 一覧` 既存 pattern が維持されている (= source of truth)
  const home = readFileSync(
    resolve(process.cwd(), 'src/app/(workspace)/[workspaceId]/page.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">← <\/span>一覧/.test(home)) {
    findings.push({ level: 'info', message: `home ← 一覧 既存 pattern 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `home ← 一覧 pattern 破壊` })
  }

  console.log(`\n=== Findings (back-link-arrow-iter657) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
