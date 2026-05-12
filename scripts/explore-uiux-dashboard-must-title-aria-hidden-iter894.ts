/**
 * Phase 6.15 loop iter 894 (mode-D Desktop a11y) —
 * dashboard-view.tsx dashboard-must-title button 内 visible "{item.title}" を
 * aria-hidden span で wrap (iter800-893 sweep の続編、Dashboard MUST 一覧の
 * row title を view row title 完結 sweep に追加)。
 *
 * 課題: dashboard-view.tsx 行 1404-1408 の dashboard-must-title button は
 *   aria-label "MUST「{title}」を編集" を持つのに、内側 visible "{item.title}"
 *   は aria-hidden 無し → SR で重複読み上げ可能性。Dashboard view の MUST Item
 *   一覧の各 row 主要 entry point。iter887/888 row title 完結 sweep の Dashboard
 *   部分。
 *
 * fix (1 ファイル ~1 行差分):
 *   - visible "{item.title}" を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter735/891/892/893 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const dv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/dashboard-view.tsx'),
    'utf8',
  )
  if (
    /data-testid=\{`dashboard-must-title-\$\{item\.id\}`\}[\s\S]*?<span aria-hidden="true">\{item\.title\}<\/span>/.test(
      dv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter894: dashboard-must-title button aria-hidden span OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter894: dashboard-must-title aria-hidden 不在`,
    })
  }

  // iter893 invariant: operation-board tactics aria-hidden 維持
  const obw = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )
  if ((obw.match(/<span className="truncate" aria-hidden="true">/g) ?? []).length >= 2) {
    findings.push({
      level: 'info',
      message: `iter893 invariant: operation-board tactics aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter893 invariant: 破壊` })
  }

  // iter892 invariant: auth footer links aria-hidden 維持
  const lp = readFileSync(resolve(process.cwd(), 'src/app/(auth)/login/page.tsx'), 'utf8')
  if (/<span aria-hidden="true">サインアップ<\/span>/.test(lp)) {
    findings.push({
      level: 'info',
      message: `iter892 invariant: auth footer links aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter892 invariant: 破壊` })
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

  console.log(`\n=== Findings (iter894) ===`)
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
