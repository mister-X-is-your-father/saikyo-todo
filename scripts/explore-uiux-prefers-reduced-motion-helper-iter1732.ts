/**
 * Phase 6.15 loop iter1732 refactor: prefers-reduced-motion check を inline 重複
 * (iter1726 focusElementById + iter1727 gantt-view scrollToToday) から
 * `prefersReducedMotion()` helper (`src/lib/ui/prefers-reduced-motion.ts`) に集約。
 *
 * 集約前: 2 file で同 logic を inline:
 *   const prefersReducedMotion =
 *     typeof window !== 'undefined' &&
 *     window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
 *
 * 集約後: 各 caller は import + 関数呼び出し 1 行:
 *   import { prefersReducedMotion } from '@/lib/ui/prefers-reduced-motion'
 *   const behavior: ScrollBehavior = prefersReducedMotion() ? 'auto' : 'smooth'
 *
 * 効果:
 *  - DRY: 2 → 1 source of truth、将来 caller 追加時の inline 漏れ予防
 *  - test 集約: prefersReducedMotion 単独 4 軸 unit test (matchMedia 未実装 / matches=false /
 *    matches=true / query 文字列)、caller 側 test は behavior 切替のみ verify
 *  - jsdom matchMedia 未実装環境 (= test default) で false fall-through 維持
 *
 * 実行: pnpm tsx scripts/explore-uiux-prefers-reduced-motion-helper-iter1732.ts
 * 前提: なし (source 直読 invariant)
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

interface Finding {
  level: 'error' | 'warning' | 'info'
  source: string
  message: string
}

async function main() {
  const findings: Finding[] = []
  const here = dirname(fileURLToPath(import.meta.url))

  const helper = readFileSync(resolve(here, '../src/lib/ui/prefers-reduced-motion.ts'), 'utf8')
  const helperTest = readFileSync(
    resolve(here, '../src/lib/ui/prefers-reduced-motion.test.ts'),
    'utf8',
  )
  const focusUtil = readFileSync(resolve(here, '../src/lib/ui/focus-quick-add.ts'), 'utf8')
  const ganttView = readFileSync(
    resolve(here, '../src/components/workspace/gantt-view.tsx'),
    'utf8',
  )

  // --- 1. helper が export されている ---
  if (!helper.includes('export function prefersReducedMotion')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'prefers-reduced-motion.ts に export function prefersReducedMotion が無い',
    })
  }

  // --- 2. helper test が 4 軸 cover ---
  for (const desc of [
    'matchMedia 未実装',
    'matchMedia.matches=false',
    'matchMedia.matches=true',
    '(prefers-reduced-motion: reduce) を query',
  ]) {
    if (!helperTest.includes(desc)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `prefers-reduced-motion.test.ts に "${desc}" test が無い`,
      })
    }
  }

  // --- 3. focusElementById が helper 経由 ---
  if (!focusUtil.includes("from './prefers-reduced-motion'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'focus-quick-add.ts に prefers-reduced-motion helper の import が無い',
    })
  }
  if (!focusUtil.match(/prefersReducedMotion\(\)\s*\?\s*'auto'\s*:\s*'smooth'/)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'focus-quick-add.ts が prefersReducedMotion() helper 経由でない',
    })
  }

  // --- 4. gantt-view が helper 経由 ---
  if (!ganttView.includes("from '@/lib/ui/prefers-reduced-motion'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'gantt-view.tsx に prefers-reduced-motion helper の import が無い',
    })
  }
  if (!ganttView.match(/prefersReducedMotion\(\)\s*\?\s*'auto'\s*:\s*behavior/)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'gantt-view.tsx が prefersReducedMotion() helper 経由でない',
    })
  }

  // --- 5. focus-quick-add から旧 inline (window.matchMedia? の inline 配線) 撤去確認 ---
  //   helper 経由なので caller には matchMedia direct call は残らない (import 経由のみ)。
  //   focus-quick-add.ts の本文に matchMedia の直接 call が残ってない。
  if (focusUtil.match(/^[^*\/]*window\.matchMedia\?/m)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'focus-quick-add.ts に旧 inline window.matchMedia? が残存',
    })
  }

  // --- 6. gantt-view も旧 inline matchMedia direct call 撤去確認 ---
  if (ganttView.match(/^\s*const prefersReducedMotion\s*=\s*\n?\s*typeof window/m)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'gantt-view.tsx に旧 inline matchMedia 配線が残存',
    })
  }

  // --- 7. iter1731 reference invariant: workspace nav 8 link data-testid 維持 ---
  const workspacePage = readFileSync(
    resolve(here, '../src/app/(workspace)/[workspaceId]/page.tsx'),
    'utf8',
  )
  const navTestIds = (workspacePage.match(/data-testid="nav-[a-z-]+"/g) ?? []).length
  if (navTestIds !== 8) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `iter1731 workspace nav-* data-testid 件数が ${navTestIds} (期待 8)`,
    })
  }

  // --- 8. iter1730 reference invariant: back-to-workspaces data-testid 維持 ---
  if (!workspacePage.includes('data-testid="back-to-workspaces"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1730 back-to-workspaces data-testid が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — prefersReducedMotion() helper に集約済、focus-quick-add / gantt-view 両 caller が import 経由、4 軸 unit test cover、iter1731 / iter1730 invariant 不変',
    )
  } else {
    for (const f of findings) console.log(`  [${f.level}/${f.source}] ${f.message}`)
  }
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
