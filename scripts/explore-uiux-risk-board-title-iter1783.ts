/**
 * Phase 6.15 loop iter1783: sprint-risk-board-widget topRisk button に title 付与
 * (iter1777 view-switcher / iter1779 workspace nav / iter1781 logout と同 pattern を
 * risk-board button にも展開、risk context の sighted hover disclosure)。
 *
 * 発見した UX gap (sighted only):
 *   src/components/sprint/sprint-risk-board-widget.tsx line 117-126 の topRisk button は
 *   aria-label `${item.title} を開く — risk score ${riskScore}${...理由 N 件}` で context
 *   を SR 提供だが、sighted は button hover で context 即把握できなかった (aria-label は
 *   browser tooltip にならず、inner truncate span の title={item.title} は span 上 hover
 *   でしか出ず risk score / 理由件数 context は無い)。
 *
 * 修正 (src/components/sprint/sprint-risk-board-widget.tsx, 4 line 追加 + 5 line comment):
 *   button に `title={同 aria-label}` 付与。aria-label / className / onClick / data-testid
 *   完全不変、shadcn 編集なし、機能追加なし。
 *
 * 実行: pnpm tsx scripts/explore-uiux-risk-board-title-iter1783.ts
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

  const widget = readFileSync(
    resolve(here, '../src/components/sprint/sprint-risk-board-widget.tsx'),
    'utf8',
  )

  // --- 1. topRisk button に title 付与済 ---
  if (!widget.includes('title={`${entry.item.title} を開く — risk score ${entry.riskScore}${')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sprint-risk-board-widget topRisk button に title が無い',
    })
  }

  // --- 2. iter1745 assigneeLoad td title 維持 ---
  if (!widget.includes('title={load.name}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1745 sprint-risk-board assigneeLoad title が消えている',
    })
  }

  // --- 3. 旧 inner truncate title 維持 ---
  if (!widget.includes('title={entry.item.title}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sprint-risk-board inner truncate title が消えている',
    })
  }

  // --- 4. iter1781 home page + mock-top-nav logout title 維持 ---
  const homePage = readFileSync(resolve(here, '../src/app/page.tsx'), 'utf8')
  if (!homePage.includes('title="ログアウト — ログイン画面に戻る"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1781 home page logout title が消えている',
    })
  }
  const mockTopNav = readFileSync(
    resolve(here, '../src/components/mock-timesheet/mock-top-nav.tsx'),
    'utf8',
  )
  if (!mockTopNav.includes('title="ログアウト — mock-timesheet session を終了"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1781 mock-top-nav logout title が消えている',
    })
  }

  // --- 5. iter1779 workspace nav Goals title 維持 ---
  const wsPage = readFileSync(
    resolve(here, '../src/app/(workspace)/[workspaceId]/page.tsx'),
    'utf8',
  )
  if (!wsPage.includes('title="Goals — OKR / Goals (Objective + Key Results) ページへ移動"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1779 workspace nav Goals title が消えている',
    })
  }

  // --- 6. iter1777 view-switcher Today title 維持 ---
  const board = readFileSync(resolve(here, '../src/components/workspace/items-board.tsx'), 'utf8')
  if (!board.includes('title="Today — 今日のタスク優先順、scheduledFor=今日 + 期限近接"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1777 view-switcher Today title が消えている',
    })
  }

  // --- 7. iter1773 timeline-lane EventBlock title 維持 ---
  const timeline = readFileSync(
    resolve(here, '../src/components/schedule/timeline-lane.tsx'),
    'utf8',
  )
  if (!timeline.includes('title={fullLabel}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1773 timeline-lane EventBlock title が消えている',
    })
  }

  // --- 8. iter1732 prefers-reduced-motion helper 維持 ---
  const helper = readFileSync(resolve(here, '../src/lib/ui/prefers-reduced-motion.ts'), 'utf8')
  if (!helper.includes('export function prefersReducedMotion')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1732 prefers-reduced-motion helper が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — sprint-risk-board topRisk button に title 付与で risk context の sighted hover disclosure、iter1781-1732 invariant 不変',
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
