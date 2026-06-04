/**
 * Phase 6.15 loop iter1737: today-view + personal-period-view item title button に title
 * 付与で sighted hover で全 title disclose (iter1720-1736 sweep の today/period 側 counterpart)。
 *
 * 発見した UX gap (sighted only):
 *   - src/components/workspace/today-view.tsx item title button (line 306+) は truncate
 *     className を持つが title 属性無し、aria-label は browser tooltip にならず sighted は
 *     hover で全 title を見れない
 *   - src/components/workspace/personal-period-view.tsx item title button (line 243+) も同 gap
 *
 * 修正 (2 file, 各 1 line + 3 line comment):
 *   - today-view: <button> に `title={it.title}` 付与
 *   - personal-period-view: <button> に `title={it.title}` 付与
 *   - aria-label / className / data-testid / onClick / 既存属性 全て不変
 *   - shadcn 編集なし、機能追加なし
 *
 * 実行: pnpm tsx scripts/explore-uiux-today-period-title-iter1737.ts
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

  const todayView = readFileSync(
    resolve(here, '../src/components/workspace/today-view.tsx'),
    'utf8',
  )
  const personalPeriodView = readFileSync(
    resolve(here, '../src/components/workspace/personal-period-view.tsx'),
    'utf8',
  )

  // --- 1. today-view item title button に title={it.title} 付与済 ---
  //   note: iter1737 added comment block is ~700 chars; regex limit 1500 で余裕。
  if (
    !todayView.match(/data-testid=\{`today-title-\$\{it\.id\}`\}[\s\S]{0,1500}title=\{it\.title\}/)
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'today-view.tsx item title button に title={it.title} が無い',
    })
  }

  // --- 2. personal-period-view item title button に title={it.title} 付与済 ---
  if (
    !personalPeriodView.match(
      /data-testid=\{`period-title-\$\{period\}-\$\{it\.id\}`\}[\s\S]{0,1500}title=\{it\.title\}/,
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'personal-period-view.tsx item title button に title={it.title} が無い',
    })
  }

  // --- 3. today-view aria-label "${it.title} — 編集" 維持 (iter1156) ---
  if (!todayView.includes('aria-label={`${it.title} — 編集`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'today-view.tsx aria-label em-dash convention が消えている',
    })
  }

  // --- 4. personal-period-view aria-label 維持 (iter1157) ---
  if (!personalPeriodView.includes('aria-label={`${it.title} — 編集`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'personal-period-view.tsx aria-label em-dash convention が消えている',
    })
  }

  // --- 5. iter1736 reference invariant: inbox title 維持 ---
  const inboxView = readFileSync(
    resolve(here, '../src/components/workspace/inbox-view.tsx'),
    'utf8',
  )
  if (!inboxView.includes('title={it.title}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1736 inbox-view title={it.title} が消えている',
    })
  }

  // --- 6. iter1735 reference invariant: taskchute title 維持 ---
  const taskchute = readFileSync(
    resolve(here, '../src/components/workspace/taskchute-view.tsx'),
    'utf8',
  )
  if (!taskchute.includes('title={item.title}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1735 taskchute-view title={item.title} が消えている',
    })
  }

  // --- 7. iter1734 reference invariant: operation-board ItemRow title 維持 ---
  const opBoard = readFileSync(
    resolve(here, '../src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )
  if (!opBoard.includes('title={item.title}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1734 operation-board ItemRow title={item.title} が消えている',
    })
  }

  // --- 8. iter1732 reference invariant: prefers-reduced-motion helper 維持 ---
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
      '(なし) — today-view + personal-period-view item title button に title 付与で sighted hover disclosure、iter1736 / iter1735 / iter1734 / iter1732 invariant 不変',
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
