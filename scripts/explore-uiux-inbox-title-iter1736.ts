/**
 * Phase 6.15 loop iter1736: inbox-view item row に title 付与で sighted hover で全 title
 * disclose (iter1720/1733/1734/1735 truncate + title sweep を inbox にも)。
 *
 * 発見した UX gap (sighted only):
 *   src/components/workspace/inbox-view.tsx item row (div role="button") は
 *   `<span className="truncate text-left font-medium" aria-hidden="true">{it.title}</span>`
 *   で visual truncate、div 自体は aria-label "${it.title} — 編集ダイアログで開く" を持つが
 *   aria-label は browser tooltip にならず sighted は hover で全 title を見れない。
 *
 * 修正 (src/components/workspace/inbox-view.tsx, 1 line + 3 line comment):
 *   <div role="button"> に `title={it.title}` 付与。aria-label / className / onClick /
 *   onKeyDown / 既存属性 完全不変、shadcn 編集なし、機能追加なし。
 *
 * 実行: pnpm tsx scripts/explore-uiux-inbox-title-iter1736.ts
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

  const inboxView = readFileSync(
    resolve(here, '../src/components/workspace/inbox-view.tsx'),
    'utf8',
  )

  // --- 1. inbox row に title={it.title} 付与済 ---
  if (!inboxView.match(/title=\{it\.title\}/)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'inbox-view.tsx に title={it.title} が無い',
    })
  }

  // --- 2. aria-label "${it.title} — 編集ダイアログで開く" 維持 (iter1541) ---
  if (!inboxView.includes('aria-label={`${it.title} — 編集ダイアログで開く`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'inbox-view.tsx aria-label "${it.title} — 編集ダイアログで開く" が消えている',
    })
  }

  // --- 3. role="button" + tabIndex={0} 維持 (keyboard accessibility) ---
  if (!inboxView.includes('role="button"') || !inboxView.includes('tabIndex={0}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'inbox-view.tsx の role="button" / tabIndex={0} が消えている',
    })
  }

  // --- 4. onKeyDown Enter/Space handling 維持 ---
  if (!inboxView.match(/e\.key === 'Enter'\s*\|\|\s*e\.key === ' '/)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'inbox-view.tsx の Enter/Space keyboard activation が消えている',
    })
  }

  // --- 5. iter1735 reference invariant: taskchute title 維持 ---
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

  // --- 6. iter1734 reference invariant: operation-board ItemRow title 維持 ---
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

  // --- 7. iter1733 reference invariant: time-entries-table title 維持 ---
  const timeEntriesTable = readFileSync(
    resolve(here, '../src/components/time-entry/time-entries-table.tsx'),
    'utf8',
  )
  if (!timeEntriesTable.match(/title=\{e\.description\s*\|\|\s*''\}/)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1733 time-entries-table description title が消えている',
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
      '(なし) — inbox-view item row に title 付与で sighted hover で全 title disclose、iter1735 / iter1734 / iter1733 / iter1732 invariant 不変',
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
