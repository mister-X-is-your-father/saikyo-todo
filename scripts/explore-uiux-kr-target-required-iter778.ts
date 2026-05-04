/**
 * Phase 6.15 loop iter 778 (mode-D Desktop a11y) —
 * goals-panel KR target input (manual mode) に required + aria-required + aria-invalid 追加。
 * iter770-777 form required attribute sweep の続き。
 *
 * 課題: goals-panel.tsx 行 792-809 の target Input は manual mode で表示され、KR を達成
 *   判定するための数値として必須だが HTML required / aria-required 属性が無い。
 *   target は Number.isNaN チェックでバリデートされるので aria-invalid も追加。
 *
 * fix (1 ファイル ~3 行差分):
 *   - target Input に `required` + `aria-required="true"` + `aria-invalid` 追加
 *
 * 検証: source-side regex assert + iter735-777 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if (
    /value=\{target\}\s*\n\s*onChange=\{[^}]+\}\s*\n\s*placeholder="例: 100"\s*\n\s*className="[^"]+"\s*\n\s*required\s*\n\s*aria-required="true"\s*\n\s*aria-invalid=\{\(target !== '' && Number\.isNaN\(Number\(target\)\)\) \|\| undefined\}/.test(
      gp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `KR target Input required + aria-required + aria-invalid 追加 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `KR target Input required 追加 不完全`,
    })
  }

  // iter777 invariant: sprint-defaults-length input required
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (
    /id="sprint-defaults-length"\s*\n\s*type="number"[^]+\s*\n\s*required\s*\n\s*aria-required="true"/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter777 invariant: sprint-defaults-length input required 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter777 invariant: 破壊` })
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

  // iter771 invariant: KR mode select required
  if (
    /value=\{mode\}\s*\n\s*onChange=\{[^}]+\}\s*\n\s*className="rounded border px-2 py-1 text-xs"\s*\n\s*required\s*\n\s*aria-required="true"/.test(
      gp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter771 invariant: KR mode select required 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter771 invariant: 破壊` })
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

  console.log(`\n=== Findings (kr-target-required-iter778) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
