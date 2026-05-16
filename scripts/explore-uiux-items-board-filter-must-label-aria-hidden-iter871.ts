/**
 * Phase 6.15 loop iter 871 (mode-D Desktop a11y) —
 * items-board の filter checkbox label "MUST のみ" を <span aria-hidden="true"> で wrap し、
 * input aria-label 単独経路に統一。
 *
 * 経緯: iter844-870 sweep の続編。Item filter bar の MUST checkbox は input に
 *   aria-label "MUST のみ表示中 (クリックで解除)" / 「MUST のみ表示に絞り込む」 完全 content
 *   を持つが、surrounding <label> 内の visible text "MUST のみ" は aria-hidden 無し
 *   → SR は <label> implicit text と input aria-label を両方読み上げる重複。
 *
 * 修正: visible "MUST のみ" を <span aria-hidden="true"> で wrap、input aria-label 単独経路に統一。
 *   Tailwind layout (flex / gap-1) 維持、checkbox click target 拡大も維持。
 *
 * 検証: source-side regex assert + iter735/843/849-870 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ib = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )

  // 1. visible "MUST のみ" を span aria-hidden で wrap
  if (/<span aria-hidden="true">MUST のみ<\/span>/.test(ib)) {
    findings.push({
      level: 'info',
      message: `items-board filter "MUST のみ" label visible aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `items-board filter "MUST のみ" label visible aria-hidden 未統合`,
    })
  }

  // 2. input aria-label 完全 content 維持 (2 状態)
  if (
    /aria-label=\{must \? 'MUST のみ表示中 \(クリックで解除\)' : 'MUST のみ表示に絞り込む'\}/.test(
      ib,
    )
  ) {
    findings.push({
      level: 'info',
      message: `items-board filter MUST input aria-label 2 状態 完全 content 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `items-board filter MUST input aria-label 破壊`,
    })
  }

  // 3. data-testid + label 構造維持
  if (
    /data-testid="filter-must"/.test(ib) &&
    /<label htmlFor="filter-must" className="flex items-center gap-1">/.test(ib) &&
    /id="filter-must"/.test(ib)
  ) {
    findings.push({
      level: 'info',
      message: `items-board filter MUST label 構造 + data-testid 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `items-board filter MUST 構造 破壊`,
    })
  }

  // iter841 invariant: items-board view-switcher 9 button aria-hidden
  const viewBtnCount = (
    ib.match(
      /<span aria-hidden="true">(?:Today|Inbox|Kanban|Backlog|Gantt|Dashboard|日次|週次|月次)<\/span>/g,
    ) ?? []
  ).length
  if (viewBtnCount >= 9) {
    findings.push({
      level: 'info',
      message: `iter841 invariant: items-board view-switcher 9 button aria-hidden 維持 OK (${viewBtnCount} 箇所)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter841 invariant: 破壊 (現在 ${viewBtnCount} 箇所)`,
    })
  }

  // iter870 invariant: workspace home 一覧 Link
  const wsHome = readFileSync(
    resolve(process.cwd(), 'src/app/(workspace)/[workspaceId]/page.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">← 一覧<\/span>/.test(wsHome)) {
    findings.push({
      level: 'info',
      message: `iter870 invariant: workspace home 一覧 Link aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter870 invariant: 破壊` })
  }

  // iter735 invariant
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

  console.log(`\n=== Findings (items-board-filter-must-label-aria-hidden-iter871) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
