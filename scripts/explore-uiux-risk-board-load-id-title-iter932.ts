/**
 * Phase 6.15 loop iter 932 (mode-D Desktop UX polish) —
 * sprint-risk-board-widget 担当者負荷 table の <td title={load.id}> を削除。
 *
 * 経緯: title={load.id} は assignee の生 UUID を mouse hover で表示していた。
 *   - SR は visible {load.name} を読む (assignee 名 or fallback "actorType:id8") のため
 *     title の SR 機能は不要
 *   - mouse hover でユーザに見せる情報として UUID は無意味 (人間 readable でない)
 *   - load.name が既に短縮 id を含む fallback を持つため UUID 補足は冗長
 *
 * 修正 (+1/-3 行、1 file): td title={load.id} 削除、{load.name} だけ残す (single line td)。
 *
 * 検証: source-side regex assert + iter735/931 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const srbw = readFileSync(
    resolve(process.cwd(), 'src/components/sprint/sprint-risk-board-widget.tsx'),
    'utf8',
  )

  // 1. td title={load.id} 削除 OK
  if (!/title=\{load\.id\}/.test(srbw)) {
    findings.push({
      level: 'info',
      message: `risk-board load row td title={load.id} 削除 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `risk-board load row td title={load.id} 残存`,
    })
  }

  // 2. {load.name} visible 維持
  if (/<td className="truncate py-1">\{load\.name\}<\/td>/.test(srbw)) {
    findings.push({
      level: 'info',
      message: `risk-board load row td {load.name} visible 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `risk-board load row td {load.name} visible 破壊`,
    })
  }

  // 3. data-testid 維持
  if (/data-testid=\{`risk-load-row-\$\{load\.id\}`\}/.test(srbw)) {
    findings.push({
      level: 'info',
      message: `risk-board load row data-testid 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `risk-board load row data-testid 破壊`,
    })
  }

  // iter931 invariant: workspace-mode-selector aria-labelledby
  const wms = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/workspace-mode-selector.tsx'),
    'utf8',
  )
  if (/aria-labelledby="workspace-mode-selector-heading"/.test(wms)) {
    findings.push({
      level: 'info',
      message: `iter931 invariant: workspace-mode aria-labelledby 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter931 invariant: 破壊` })
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

  console.log(`\n=== Findings (risk-board-load-id-title-iter932) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
