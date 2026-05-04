/**
 * Phase 6.15 loop iter 777 (mode-D Desktop a11y) —
 * sprints-panel sprint-defaults-length input に required + aria-required を追加。
 * iter770-776 form required attribute sweep の補完。
 *
 * 課題: sprints-panel.tsx 行 952-969 の sprint-defaults-length input は HTML5 number で
 *   min/max 1-90 を強制するが required / aria-required 属性が無い。iter770 で同 form の
 *   sprint-defaults-dow select に required + aria-required を追加したのと整合させる。
 *
 * fix (1 ファイル ~2 行差分):
 *   - input に `required` + `aria-required="true"` 追加
 *
 * 検証: source-side regex assert + iter735-776 invariant cross-check。
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
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (
    /id="sprint-defaults-length"\s*\n\s*type="number"\s*\n\s*min=\{1\}\s*\n\s*max=\{90\}\s*\n\s*step=\{1\}\s*\n\s*value=\{length\}\s*\n\s*onChange=\{[^}]+\}\s*\n\s*className="[^"]+"\s*\n\s*required\s*\n\s*aria-required="true"/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `sprint-defaults-length input required + aria-required 追加 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-defaults-length input required 追加 不完全`,
    })
  }

  // iter776 invariant: integrations 2 select required
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (
    /id="src-kind"\s*\n\s*value=\{kind\}\s*\n\s*onChange=\{[^}]+\}\s*\n\s*className="[^"]+"\s*\n\s*required\s*\n\s*aria-required="true"/.test(
      ip,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter776 invariant: integrations src-kind required 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter776 invariant: 破壊` })
  }

  // iter775 invariant: SourceCard actions group dynamic
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

  // iter770 invariant: sprint-defaults-dow select required
  if (
    /id="sprint-defaults-dow"\s*\n\s*value=\{dow\}\s*\n\s*onChange=\{[^}]+\}\s*\n\s*className="[^"]+"\s*\n\s*required\s*\n\s*aria-required="true"/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter770 invariant: sprint-defaults-dow select required 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter770 invariant: 破壊` })
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

  console.log(`\n=== Findings (sprint-defaults-length-required-iter777) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
