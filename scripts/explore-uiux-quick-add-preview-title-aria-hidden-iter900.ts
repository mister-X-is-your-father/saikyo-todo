/**
 * Phase 6.15 loop iter 900 (mode-D Desktop a11y) —
 * quick-add.tsx preview title span 内 visible "→ {preview.title}" を
 * aria-hidden 化 (iter800-899 sweep の続編、quick-add preview 完結 sweep)。
 *
 * 課題: quick-add.tsx 行 189 の preview title span は parent container に
 *   aria-label "解析結果: ${previewSummary}" (parse 全 detail を含む) があるのに、
 *   内側 visible "→ {preview.title}" は aria-hidden 無し → SR で重複読み上げ可能性。
 *   QuickAdd の preview chip 群の最上段。
 *
 * fix (1 ファイル ~2 行差分):
 *   - title span に aria-hidden="true" 追加
 *
 * 検証: source-side regex assert + iter735/897/898/899 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const qa = readFileSync(resolve(process.cwd(), 'src/components/workspace/quick-add.tsx'), 'utf8')
  if (/<span className="truncate font-mono" aria-hidden="true">\s+→ \{preview\.title\}/.test(qa)) {
    findings.push({
      level: 'info',
      message: `iter900: quick-add preview title aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter900: quick-add preview title aria-hidden 不在`,
    })
  }

  // iter899 invariant: proposal edit buttons aria-hidden 維持
  const dpp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (
    /data-testid=\{`proposal-\$\{proposal\.id\}-edit-cancel`\}[\s\S]*?<span aria-hidden="true">キャンセル<\/span>/.test(
      dpp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter899 invariant: proposal edit buttons aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter899 invariant: 破壊` })
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

  console.log(`\n=== Findings (iter900) ===`)
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
