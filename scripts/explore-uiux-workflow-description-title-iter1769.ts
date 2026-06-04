/**
 * Phase 6.15 loop iter1769: workflows-panel CardContent 内 description <p> に title 付与
 * (iter1755 sprints/goals / iter1756 decompose と同 line-clamp + title pattern を workflow に
 * 展開、line-clamp + title sweep の workflows 補完)。
 *
 * 発見した UX gap (sighted only):
 *   src/components/workflow/workflows-panel.tsx line 329 旧:
 *     <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">{wf.description}</p>
 *   は line-clamp-2 で 2 行超切れ、title 無で sighted は hover で全 description 見れず。
 *   (iter1740 で CardTitle に title={wf.name} 付与済、本 iter で description 補完)
 *
 * 修正 (src/components/workflow/workflows-panel.tsx, 7 line 差替 + 3 line comment):
 *   <p> に `title={wf.description}` 付与。className / textContent 完全不変、shadcn 編集なし、
 *   機能追加なし。
 *
 * 実行: pnpm tsx scripts/explore-uiux-workflow-description-title-iter1769.ts
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

  const wfPanel = readFileSync(
    resolve(here, '../src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )

  // --- 1. description <p> に title={wf.description} 付与済 ---
  if (
    !wfPanel.match(
      /className="text-muted-foreground mt-1 line-clamp-2 text-xs"\s*\n?\s*title=\{wf\.description\}/,
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'workflows-panel.tsx description <p> に title が無い',
    })
  }

  // --- 2. iter1740 CardTitle title={wf.name} 維持 ---
  if (!wfPanel.includes('title={wf.name}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1740 workflows-panel CardTitle title が消えている',
    })
  }

  // --- 3. iter1767 ErrorState retry title 維持 ---
  const asyncStates = readFileSync(
    resolve(here, '../src/components/shared/async-states.tsx'),
    'utf8',
  )
  if (!asyncStates.includes('title={`再試行 — 「${message}」をクリアして再試行`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1767 ErrorState retry title が消えている',
    })
  }

  // --- 4. iter1765 calendar-view nav title 維持 ---
  const calendarView = readFileSync(
    resolve(here, '../src/components/schedule/calendar-view.tsx'),
    'utf8',
  )
  if (
    !calendarView.includes("title={`前日 — ${format(subDays(date, 1), 'M月d日 (eee)')} を表示`}")
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1765 calendar-view prev title が消えている',
    })
  }

  // --- 5. iter1756 decompose-proposals line-clamp title 維持 ---
  const decomposePanel = readFileSync(
    resolve(here, '../src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (!decomposePanel.includes('title={proposal.description}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1756 decompose-proposals description title が消えている',
    })
  }

  // --- 6. iter1755 sprints/goals line-clamp title 維持 ---
  const sprintsPanel = readFileSync(
    resolve(here, '../src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (!sprintsPanel.includes('title={sprint.goal}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1755 sprints-panel line-clamp goal title が消えている',
    })
  }

  // --- 7. iter1763 theme-toggle title 維持 ---
  const themeToggle = readFileSync(
    resolve(here, '../src/components/shared/theme-toggle.tsx'),
    'utf8',
  )
  if (
    !themeToggle.match(
      /title=\{\s*\n?\s*resolvedTheme === 'dark' \? 'ライトテーマに切替' : 'ダークテーマに切替'\s*\n?\s*\}/,
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1763 theme-toggle conditional title が消えている',
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
      '(なし) — workflows-panel description <p> に title 付与で sighted hover で全 description disclose、iter1767-1732 invariant 不変',
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
