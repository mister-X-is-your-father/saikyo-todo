/**
 * Phase 6.15 loop iter 835 (mode-D Desktop a11y) —
 * template-items-editor 子 Item 追加 button visible "+ 追加" を aria-hidden span で wrap。
 *
 * 課題: template-items-editor.tsx 行 190 の Submit button visible text "+ 追加" は
 *   parent Button に aria-label が完全 content を含むのに aria-hidden 無し。
 *
 * fix (1 ファイル ~1 行差分):
 *   - "+ 追加" を <span aria-hidden="true">+ 追加</span> に
 *
 * 検証: source-side regex assert + iter735-834 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const tie = readFileSync(
    resolve(process.cwd(), 'src/components/template/template-items-editor.tsx'),
    'utf8',
  )
  const hasAriaHidden = /<span aria-hidden="true">\+ 追加<\/span>/.test(tie)
  if (hasAriaHidden) {
    findings.push({
      level: 'info',
      message: `template-items-editor 追加 button visible aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `template-items-editor 追加 button aria-hidden 不完全`,
    })
  }

  // iter834 invariant: heartbeat + start-timer button aria-hidden
  const hb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/heartbeat-button.tsx'),
    'utf8',
  )
  const stb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/start-timer-button.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{scan\.isPending \? 'スキャン中…' : 'Heartbeat'\}<\/span>/.test(
      hb,
    ) &&
    /<span aria-hidden="true">\{visibleLabel\}<\/span>/.test(stb)
  ) {
    findings.push({
      level: 'info',
      message: `iter834 invariant: heartbeat + start-timer aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter834 invariant: 破壊` })
  }

  // iter833 invariant: Item action 3 button visible aria-hidden
  const idb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-decompose-button.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{decompose\.isPending \? '分解中…' : 'AI 分解'\}<\/span>/.test(idb)
  ) {
    findings.push({
      level: 'info',
      message: `iter833 invariant: item-decompose-button visible aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter833 invariant: 破壊` })
  }

  // iter826 invariant: backlog updatedAt time semantic
  const bv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )
  if (/<time dateTime=\{iso\} aria-label=\{`最終更新 \$\{display\}`\}>/.test(bv)) {
    findings.push({
      level: 'info',
      message: `iter826 invariant: backlog updatedAt time semantic 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter826 invariant: 破壊` })
  }

  // iter735 invariant: team-context-editor
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

  console.log(`\n=== Findings (template-add-button-aria-hidden-iter835) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
