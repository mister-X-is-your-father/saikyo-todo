/**
 * Phase 6.15 loop iter 815 (mode-D Desktop a11y) —
 * templates-panel template card disclosure button aria-label に kind / scheduleCron を含めて拡張。
 *
 * 課題: templates-panel.tsx 行 269 の disclosure button aria-label は template name のみで
 *   visible text に表示される kind / scheduleCron 情報 (例: "[recurring · 0 9 * * *]") が
 *   含まれていなかった。Button aria-label が visible 内容を抑制するため SR ユーザは
 *   kind / cron schedule 情報にアクセス不可だった。
 *
 * fix (1 ファイル ~1 行差分):
 *   - aria-label に `(${t.kind}${t.scheduleCron ? ` · ${t.scheduleCron}` : ''})` を挿入
 *
 * 検証: source-side regex assert + iter735-814 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const tp = readFileSync(
    resolve(process.cwd(), 'src/components/template/templates-panel.tsx'),
    'utf8',
  )
  const hasKindCron =
    /aria-label=\{`Template「\$\{t\.name\}」\(\$\{t\.kind\}\$\{t\.scheduleCron \? ` · \$\{t\.scheduleCron\}` : ''\}\) の詳細を/.test(
      tp,
    )
  if (hasKindCron) {
    findings.push({
      level: 'info',
      message: `templates-panel disclosure button aria-label に kind/cron 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `templates-panel disclosure button aria-label 不完全`,
    })
  }

  // iter814 invariant: workspace-header role Badge inner aria-hidden
  const wh = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/workspace-header.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{role\}<\/span>/.test(wh)) {
    findings.push({
      level: 'info',
      message: `iter814 invariant: workspace-header role Badge aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter814 invariant: 破壊` })
  }

  // iter813 invariant: gantt-view summary chip aria-hidden
  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')
  if (
    /aria-label=\{`critical path[\s\S]*?\}\s*\n\s*>\s*\n\s*<span aria-hidden="true">/.test(gv) &&
    /aria-label=\{`遅延 [\s\S]*?\}\s*\n\s*>\s*\n\s*<span aria-hidden="true">/.test(gv)
  ) {
    findings.push({
      level: 'info',
      message: `iter813 invariant: gantt summary chip aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter813 invariant: 破壊` })
  }

  // iter812 invariant: must-badge MUST aria-hidden
  const mb = readFileSync(resolve(process.cwd(), 'src/components/workspace/must-badge.tsx'), 'utf8')
  if (
    /<span aria-hidden="true">MUST<\/span>/.test(mb) &&
    /<span className="sr-only">MUST<\/span>/.test(mb)
  ) {
    findings.push({
      level: 'info',
      message: `iter812 invariant: must-badge MUST aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter812 invariant: 破壊` })
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

  console.log(`\n=== Findings (template-card-button-aria-iter815) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
