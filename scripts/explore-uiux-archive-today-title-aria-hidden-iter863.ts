/**
 * Phase 6.15 loop iter 863 (mode-D Desktop a11y) —
 * archived-items-panel + today-view item title visible {item.title} を
 * aria-hidden span で wrap (2 callsite).
 *
 * 課題: 2 file の item title:
 *   - archived-items-panel.tsx 行 141: Link 内 visible {item.title}, aria-label
 *     "「{title}」を開く ({archivedAt})" — visible は aria-label に含まれるが aria-hidden 無し
 *   - today-view.tsx 行 221: button 内 visible {it.title}, aria-label "「{title}」を編集"
 *     — 同様に aria-hidden 無し
 * いずれも aria-label が完全 content を含むため、SR は aria-label を読むが内側 visible も
 * 一部 SR では別途読み上げされる risk + sweep の defensive 統一観点で wrap 推奨。
 * iter844-862 sweep の続編で 2 callsite 一括対応。
 *
 * fix (2 file 各 ~1 行):
 *   - archived-items Link 内 {item.title} を <span aria-hidden="true"> で wrap
 *   - today-view 内 {it.title} を <span aria-hidden="true"> で wrap
 *   - 既存 aria-label / MustBadge / StatusBadge / Link href の維持
 *
 * 検証: source-side regex assert + iter735-862 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const aip = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/archived-items-panel.tsx'),
    'utf8',
  )
  const tv = readFileSync(resolve(process.cwd(), 'src/components/workspace/today-view.tsx'), 'utf8')

  // 1. archived-items Link 内 {item.title} aria-hidden span
  if (/<span aria-hidden="true">\{item\.title\}<\/span>/.test(aip)) {
    findings.push({
      level: 'info',
      message: `archived-items title visible {item.title} aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `archived-items title visible aria-hidden 未統合`,
    })
  }

  // 2. archived-items Link aria-label 維持
  if (
    /aria-label=\{`「\$\{item\.title\}」を開く \(\$\{fmt\(item\.archivedAt\)\} にアーカイブ\)`/.test(
      aip,
    )
  ) {
    findings.push({
      level: 'info',
      message: `archived-items Link aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `archived-items Link aria-label regression` })
  }

  // 3. today-view title visible {it.title} aria-hidden span
  if (/<span aria-hidden="true">\{it\.title\}<\/span>/.test(tv)) {
    findings.push({
      level: 'info',
      message: `today-view title visible {it.title} aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `today-view title visible aria-hidden 未統合`,
    })
  }

  // 4. today-view button aria-label 維持
  if (/aria-label=\{`「\$\{it\.title\}」を編集`\}/.test(tv)) {
    findings.push({
      level: 'info',
      message: `today-view button aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `today-view button aria-label regression` })
  }

  // 5. iter862 invariant: activity-log 3 visible aria-hidden
  const al = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/activity-log.tsx'),
    'utf8',
  )
  if (
    /<span className="font-medium" aria-hidden="true">\n\s+\{label\}\n\s+<\/span>/.test(al) &&
    /<span aria-hidden="true">\{open \? '詳細を閉じる' : '詳細を見る'\}<\/span>/.test(al)
  ) {
    findings.push({
      level: 'info',
      message: `iter862 invariant: activity-log 3 visible aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter862 invariant: 破壊` })
  }

  // 6. iter735 invariant: team-context-editor aria-keyshortcuts
  const tce = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  const tceMatches = tce.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tceMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter735 invariant: team-context-editor aria-keyshortcuts 維持 OK (${tceMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant: 破壊` })
  }

  console.log(`\n=== Findings (archive-today-title-aria-hidden-iter863) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
