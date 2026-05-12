/**
 * Phase 6.15 loop iter 899 (mode-D Desktop a11y) —
 * decompose-proposals-panel.tsx 提案 edit form 2 button (キャンセル / 保存)
 * 内 visible を aria-hidden span で wrap (iter800-898 sweep の続編、proposal
 * edit form 完結 sweep)。
 *
 * 課題: decompose-proposals-panel.tsx 行 489 + 505 の edit form 2 Button は
 *   各 aria-label が完全 content を含むのに、内側 visible "キャンセル" /
 *   "{保存中… / 保存}" は aria-hidden 無し → SR で二重読み可能性。AI 分解 proposal
 *   の inline 編集 form の主要 CTA。
 *
 * fix (1 ファイル ~2 行差分): 各 button の visible を aria-hidden span で wrap。
 *
 * 検証: source-side regex assert + iter735/896/897/898 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const dpp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  const cancelHidden =
    /data-testid=\{`proposal-\$\{proposal\.id\}-edit-cancel`\}[\s\S]*?<span aria-hidden="true">キャンセル<\/span>/.test(
      dpp,
    )
  const saveHidden =
    /data-testid=\{`proposal-\$\{proposal\.id\}-save`\}[\s\S]*?<span aria-hidden="true">\{update\.isPending \? '保存中…' : '保存'\}<\/span>/.test(
      dpp,
    )
  if (cancelHidden && saveHidden) {
    findings.push({
      level: 'info',
      message: `iter899: proposal edit 2 button aria-hidden span OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter899: 不完全 (cancel=${cancelHidden} save=${saveHidden})`,
    })
  }

  // iter898 invariant: workflow node presets aria-hidden 維持
  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\+ \{preset\.type\}<\/span>/.test(wp)) {
    findings.push({
      level: 'info',
      message: `iter898 invariant: workflow node presets aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter898 invariant: 破壊` })
  }

  // iter897 invariant: workflow 4 trigger presets aria-hidden 維持
  const triggers = ['manual', 'cron', 'item-event', 'webhook']
  const missing: string[] = []
  for (const t of triggers) {
    const re = new RegExp(`<span aria-hidden="true">${t}</span>`)
    if (!re.test(wp)) missing.push(t)
  }
  if (missing.length === 0) {
    findings.push({
      level: 'info',
      message: `iter897 invariant: workflow trigger presets aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter897 invariant: 破壊 (${missing.join(',')})` })
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

  console.log(`\n=== Findings (iter899) ===`)
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
