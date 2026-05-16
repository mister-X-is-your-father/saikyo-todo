/**
 * Phase 6.15 loop iter 863 (mode-D Desktop a11y) —
 * archived-items-panel の Item title Link visible {item.title} を
 * <span aria-hidden="true"> で wrap し、aria-label 単独経路に統一。
 *
 * 経緯: iter844-862 sweep の続編。Archive view の table 内 title cell の
 *   <Link> 要素 (`/${workspaceId}?item=${id}` への遷移) は aria-label
 *   "「{title}」を開く ({archivedAt} にアーカイブ)" 完全 content を含むのに
 *   visible {item.title} は aria-hidden 無し。同 row の 復元 button (iter829)
 *   は span aria-hidden 化済 → title Link も統一。
 *
 * 修正: visible {item.title} を <span aria-hidden="true"> で wrap、
 *   aria-label 単独経路に統一。Link semantic / focus-visible style 維持。
 *
 * 検証: source-side regex assert + iter735/843/849-862 invariant cross-check。
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

  // 1. visible {item.title} を span aria-hidden で wrap
  if (/<span aria-hidden="true">\{item\.title\}<\/span>/.test(aip)) {
    findings.push({
      level: 'info',
      message: `archived-items-panel title Link visible {item.title} aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `archived-items-panel title Link visible aria-hidden 未統合`,
    })
  }

  // 2. aria-label 完全 content 維持 (open + archived 日時)
  if (
    /aria-label=\{`「\$\{item\.title\}」を開く \(\$\{fmt\(item\.archivedAt\)\} にアーカイブ\)`\}/.test(
      aip,
    )
  ) {
    findings.push({
      level: 'info',
      message: `archived-items-panel title Link aria-label 完全 content 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `archived-items-panel title Link aria-label 破壊`,
    })
  }

  // 3. iter829 invariant: 復元 button visible aria-hidden 維持
  if (/<span aria-hidden="true">\{unarchive\.isPending \? '復元中…' : '復元'\}<\/span>/.test(aip)) {
    findings.push({
      level: 'info',
      message: `iter829 invariant: archived restore button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter829 invariant: 破壊` })
  }

  // 4. data-testid 維持
  if (
    /data-testid=\{`archive-title-link-\$\{item\.id\}`\}/.test(aip) &&
    /data-testid=\{`archive-restore-\$\{item\.id\}`\}/.test(aip) &&
    /data-testid=\{`archive-row-\$\{item\.id\}`\}/.test(aip)
  ) {
    findings.push({
      level: 'info',
      message: `archived-items-panel data-testid 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `archived-items-panel data-testid 破壊`,
    })
  }

  // iter862 invariant: today + backlog title button aria-hidden
  const tv = readFileSync(resolve(process.cwd(), 'src/components/workspace/today-view.tsx'), 'utf8')
  const bv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{it\.title\}<\/span>/.test(tv) &&
    /<span aria-hidden="true">\{String\(getValue\(\)\)\}<\/span>/.test(bv) &&
    /<span aria-hidden="true">編集<\/span>/.test(bv)
  ) {
    findings.push({
      level: 'info',
      message: `iter862 invariant: today/backlog title aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter862 invariant: 破壊` })
  }

  // iter861 invariant
  const kv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/kanban-view.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{item\.title\}<\/span>/.test(kv)) {
    findings.push({
      level: 'info',
      message: `iter861 invariant: kanban-view title aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter861 invariant: 破壊` })
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

  console.log(`\n=== Findings (archived-items-title-link-aria-hidden-iter863) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
