/**
 * Phase 6.15 loop iter 776 (mode-D Desktop a11y) —
 * integrations-panel CreateSourceForm の kind / method select に required + aria-required を追加。
 * iter770-773 form required attribute sweep の続き。
 *
 * 課題: integrations-panel.tsx の `<select id="src-kind">` (行 322 周辺) と
 *   `<select id="src-method">` (行 437 周辺) は実質 required (enum 必須選択) だが
 *   HTML required / aria-required 属性が無い。SR ユーザはこれら select が必須かどうか分からない。
 *
 * fix (1 ファイル ~4 行差分):
 *   - 2 select 各々に `required` + `aria-required="true"` 追加
 *
 * 検証: source-side regex assert + iter735-775 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  // src-kind select required + aria-required
  if (
    /id="src-kind"\s*\n\s*value=\{kind\}\s*\n\s*onChange=\{[^}]+\}\s*\n\s*className="[^"]+"\s*\n\s*required\s*\n\s*aria-required="true"/.test(
      ip,
    )
  ) {
    findings.push({
      level: 'info',
      message: `integrations src-kind select required + aria-required 追加 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `integrations src-kind select required 追加 不完全`,
    })
  }
  // src-method select required + aria-required
  if (
    /id="src-method"\s*\n\s*value=\{method\}\s*\n\s*onChange=\{[^}]+\}\s*\n\s*className="[^"]+"\s*\n\s*required\s*\n\s*aria-required="true"/.test(
      ip,
    )
  ) {
    findings.push({
      level: 'info',
      message: `integrations src-method select required + aria-required 追加 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `integrations src-method select required 追加 不完全`,
    })
  }

  // iter775 invariant: SourceCard actions group dynamic enabled
  if (
    /aria-label=\{`Source「\$\{src\.name\}」の操作 \(現在: \$\{src\.enabled \? '有効' : '無効'\}、pull \/ 編集 \/ 有効化切替 \/ 削除\)`\}/.test(
      ip,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter775 invariant: SourceCard actions group dynamic 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter775 invariant: 破壊` })
  }

  // iter774 invariant: mock-submit Submit aria-busy
  const msf = readFileSync(
    resolve(process.cwd(), 'src/components/mock-timesheet/mock-submit-form.tsx'),
    'utf8',
  )
  if (
    /disabled=\{isPending\}\s*\n\s*aria-busy=\{isPending \|\| undefined\}\s*\n\s*className="h-11 w-full"/.test(
      msf,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter774 invariant: mock-submit Submit aria-busy 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter774 invariant: 破壊` })
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

  console.log(`\n=== Findings (integrations-selects-required-iter776) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
