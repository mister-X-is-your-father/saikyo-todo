/**
 * Phase 6.15 loop iter 864 (mode-D Desktop a11y) —
 * sprint-risk-board-widget の titleEl visible {entry.item.title} に
 * aria-hidden="true" を追加し、aria-label 単独経路に統一。
 *
 * 経緯: iter844-863 sweep の続編。Sprint Card 内 リスク上位 Item リストの
 *   titleEl span は parent <button> aria-label "{title} を開く (risk score {N} ...)"
 *   が完全 content を含むのに aria-hidden 無し → SR は aria-label と visible を二重読み上げ。
 *
 * 修正: titleEl span に aria-hidden="true" 追加 (visible truncate / title attr 維持)、
 *   parent button aria-label 単独経路に統一。
 *
 * 検証: source-side regex assert + iter735/843/849-863 invariant cross-check。
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

  // 1. titleEl span に aria-hidden 付与
  if (
    /<span[\s\S]+?className="flex-1 truncate text-sm"[\s\S]+?title=\{entry\.item\.title\}[\s\S]+?aria-hidden="true"[\s\S]+?>\s*\{entry\.item\.title\}/.test(
      srbw,
    )
  ) {
    findings.push({
      level: 'info',
      message: `sprint-risk-board titleEl visible {entry.item.title} aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-risk-board titleEl aria-hidden 未統合`,
    })
  }

  // 2. parent button aria-label 完全 content 維持
  if (
    /aria-label=\{`\$\{entry\.item\.title\} を開く \(risk score \$\{entry\.riskScore\}/.test(srbw)
  ) {
    findings.push({
      level: 'info',
      message: `sprint-risk-board button aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-risk-board button aria-label 破壊`,
    })
  }

  // 3. data-testid 維持 + truncate / title attr 維持
  if (
    /data-testid=\{`risk-row-\$\{entry\.item\.id\}`\}/.test(srbw) &&
    /data-testid=\{`risk-reasons-\$\{entry\.item\.id\}`\}/.test(srbw) &&
    /title=\{entry\.item\.title\}/.test(srbw) &&
    /flex-1 truncate text-sm/.test(srbw)
  ) {
    findings.push({
      level: 'info',
      message: `sprint-risk-board data-testid + truncate + title attr 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-risk-board attrs 破壊`,
    })
  }

  // iter863 invariant: archived-items title Link aria-hidden
  const aip = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/archived-items-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{item\.title\}<\/span>/.test(aip)) {
    findings.push({
      level: 'info',
      message: `iter863 invariant: archived-items title Link aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter863 invariant: 破壊` })
  }

  // iter862 invariant
  const tv = readFileSync(resolve(process.cwd(), 'src/components/workspace/today-view.tsx'), 'utf8')
  const bv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{it\.title\}<\/span>/.test(tv) &&
    /<span aria-hidden="true">\{String\(getValue\(\)\)\}<\/span>/.test(bv)
  ) {
    findings.push({
      level: 'info',
      message: `iter862 invariant: today/backlog title aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter862 invariant: 破壊` })
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

  console.log(`\n=== Findings (sprint-risk-board-title-aria-hidden-iter864) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
