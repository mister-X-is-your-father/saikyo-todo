/**
 * Phase 6.15 loop iter 855 (mode-D Desktop a11y) —
 * subtasks-panel.tsx 子件数 chip 内 visible "{N} 件" を aria-hidden span で wrap
 * (iter800-854 sweep の続編、role="img" + aria-label canonical pattern)。
 *
 * 課題: subtasks-panel.tsx 行 183-192 の childcount chip は parent <span role="img">
 *   に aria-label="このタスクには子タスクが {N} 件あります" が完全 content を含むのに、
 *   内側 visible "{N} 件" text は aria-hidden 無し。SR ユーザは aria-label を聞いた後、
 *   内側 text が再度読み上げられる AT 実装で重複。Item edit dialog 子タスク tab で
 *   subtask 行 ごとに表示される頻出 chip。
 *
 * fix (1 ファイル ~1 行差分):
 *   - "{N} 件" visible text を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter735/852/853/854 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/subtasks-panel.tsx'),
    'utf8',
  )
  const hasAriaLabel =
    /aria-label=\{`このタスクには子タスクが \$\{grandchildren\.length\} 件あります`\}/.test(sp)
  const hasInnerHidden = /<span aria-hidden="true">\{grandchildren\.length\} 件<\/span>/.test(sp)
  if (hasAriaLabel && hasInnerHidden) {
    findings.push({
      level: 'info',
      message: `iter855: subtasks-panel 子件数 chip 内 "{N} 件" aria-hidden span OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter855: childcount chip aria-hidden 不完全 (aria-label=${hasAriaLabel} inner-hidden=${hasInnerHidden})`,
    })
  }

  // iter854 invariant: gantt-view MUST badge aria-hidden span 維持
  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')
  if (/aria-label="MUST タスク"/.test(gv) && /<span aria-hidden="true">MUST<\/span>/.test(gv)) {
    findings.push({
      level: 'info',
      message: `iter854 invariant: gantt-view MUST badge aria-hidden span 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter854 invariant: 破壊` })
  }

  // iter853 invariant: comment-thread AI badge aria-hidden span 維持
  const ct = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/comment-thread.tsx'),
    'utf8',
  )
  if (
    /aria-label="AI Agent による投稿"/.test(ct) &&
    /<span aria-hidden="true">AI<\/span>/.test(ct)
  ) {
    findings.push({
      level: 'info',
      message: `iter853 invariant: comment-thread AI badge aria-hidden span 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter853 invariant: 破壊` })
  }

  // iter852 invariant: SeverityChip inner aria-hidden span 維持
  const sc = readFileSync(resolve(process.cwd(), 'src/components/shared/severity-chip.tsx'), 'utf8')
  if (
    /<span aria-hidden="true" className="truncate font-medium">/.test(sc) &&
    /<span\s+aria-hidden="true"\s+className="shrink-0 text-\[10px\] font-semibold opacity-90">/.test(
      sc,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter852 invariant: SeverityChip inner aria-hidden span 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter852 invariant: 破壊` })
  }

  // iter735 invariant: shadcn UI 未編集
  const tabs = readFileSync(resolve(process.cwd(), 'src/components/ui/tabs.tsx'), 'utf8')
  if (!/aria-hidden/.test(tabs)) {
    findings.push({ level: 'info', message: `iter735 invariant: shadcn/tabs.tsx 未編集 OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `iter735 invariant: shadcn tabs.tsx に aria-hidden 編集が混入`,
    })
  }

  console.log(`\n=== Findings (iter855) ===`)
  if (findings.length === 0) console.log('(なし)')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
