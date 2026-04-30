/**
 * Phase 6.15 loop iter 406 — workspace 配下 9 page (workspace home +
 * sprints / goals / pdca / workflows / time-entries / templates /
 * integrations / archive) の <main> に tabIndex={-1} 追加 (iter404 pattern
 * を workspace 配下に水平展開し codebase 全 main element の skip-link
 * focus 完遂を実現)。
 *
 * 課題: iter404 で 5 unauth page (auth layout / ~offline / mock-timesheet
 *   3 page) の <main> に tabIndex={-1} を追加したが、workspace 配下 9 page
 *   は未対応で skip-link focus 移動が機能しない (iter404 と同 dead-loop)。
 *   iter404 hint「残 9 file (workspace 配下 8 page + [workspaceId]/page.tsx)
 *   の <main> にも tabIndex={-1} 展開」に従い本 iter で完成。
 *
 * fix: 9 file × 4 line 差替 (各 <main> に tabIndex={-1} +
 *   focus-visible:outline-none 追加、JSX が 1 行から複数行に展開)。
 *   - src/app/(workspace)/[workspaceId]/page.tsx (workspace home)
 *   - src/app/(workspace)/[workspaceId]/sprints/page.tsx
 *   - src/app/(workspace)/[workspaceId]/goals/page.tsx
 *   - src/app/(workspace)/[workspaceId]/pdca/page.tsx
 *   - src/app/(workspace)/[workspaceId]/workflows/page.tsx
 *   - src/app/(workspace)/[workspaceId]/time-entries/page.tsx
 *   - src/app/(workspace)/[workspaceId]/templates/page.tsx
 *   - src/app/(workspace)/[workspaceId]/integrations/page.tsx
 *   - src/app/(workspace)/[workspaceId]/archive/page.tsx
 *
 *   全 file 同 className "container mx-auto max-w-5xl space-y-6 p-4 md:p-6"
 *   を共有しており、`focus-visible:outline-none` を末尾に append。
 *
 *   これで iter404 (5 unauth page) + iter406 (9 workspace page) =
 *   codebase 全 14 <main> element に tabIndex={-1} carriage 100% 達成、
 *   skip-link → main focus 移動が全 page で機能する。
 *
 * 機能追加なし、shadcn 編集なし、影響面 9 ファイル (iter404 と同
 * horizontal expansion 形式)。視覚的 layout 不変。
 *
 * 検証: source-side regex assert で codify (workspace page は cloud env
 *   で auth 必須のため browser interaction 不可、static audit で代替)。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

const WORKSPACE_PAGES = [
  'src/app/(workspace)/[workspaceId]/page.tsx',
  'src/app/(workspace)/[workspaceId]/sprints/page.tsx',
  'src/app/(workspace)/[workspaceId]/goals/page.tsx',
  'src/app/(workspace)/[workspaceId]/pdca/page.tsx',
  'src/app/(workspace)/[workspaceId]/workflows/page.tsx',
  'src/app/(workspace)/[workspaceId]/time-entries/page.tsx',
  'src/app/(workspace)/[workspaceId]/templates/page.tsx',
  'src/app/(workspace)/[workspaceId]/integrations/page.tsx',
  'src/app/(workspace)/[workspaceId]/archive/page.tsx',
]

const ITER404_PAGES = [
  'src/app/(auth)/layout.tsx',
  'src/app/~offline/page.tsx',
  'src/app/mock-timesheet/login/page.tsx',
  'src/app/mock-timesheet/new/page.tsx',
  'src/app/mock-timesheet/entries/page.tsx',
]

async function main(): Promise<void> {
  const findings: Finding[] = []

  for (const path of WORKSPACE_PAGES) {
    const src = readFileSync(resolve(process.cwd(), path), 'utf8')
    const mainMatch = src.match(/<main[\s\S]*?id="main-content"[\s\S]*?>/)
    if (!mainMatch) {
      findings.push({ level: 'warning', message: `${path}: <main> block 不在` })
      continue
    }
    const mainBlock = mainMatch[0]

    if (!/tabIndex=\{-1\}/.test(mainBlock)) {
      findings.push({
        level: 'warning',
        message: `${path}: tabIndex={-1} が無い`,
      })
    } else {
      findings.push({ level: 'info', message: `${path}: tabIndex={-1} OK` })
    }

    if (!/focus-visible:outline-none/.test(mainBlock)) {
      findings.push({
        level: 'warning',
        message: `${path}: focus-visible:outline-none が無い`,
      })
    } else {
      findings.push({ level: 'info', message: `${path}: focus-visible:outline-none OK` })
    }
  }

  // iter404 invariant 維持: 5 unauth page の tabIndex={-1}
  for (const path of ITER404_PAGES) {
    const src = readFileSync(resolve(process.cwd(), path), 'utf8')
    const mainMatch = src.match(/<main[\s\S]*?id="main-content"[\s\S]*?>/)
    if (!mainMatch || !/tabIndex=\{-1\}/.test(mainMatch[0])) {
      findings.push({
        level: 'warning',
        message: `${path}: iter404 tabIndex={-1} が消えた (regression)`,
      })
    }
  }

  // 全 14 main element に tabIndex={-1} carriage 100%
  const total = WORKSPACE_PAGES.length + ITER404_PAGES.length
  const passed = findings.filter((f) => f.level === 'info' && f.message.endsWith('tabIndex={-1} OK'))
    .length
  if (passed !== WORKSPACE_PAGES.length) {
    findings.push({
      level: 'warning',
      message: `workspace 9 page tabIndex carriage incomplete: ${passed}/${WORKSPACE_PAGES.length}`,
    })
  } else {
    findings.push({
      level: 'info',
      message: `iter404+iter406 = codebase 全 ${total} main element tabIndex={-1} carriage 100% 達成`,
    })
  }

  console.log(`\n=== Findings (workspace-tabindex-iter406) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
