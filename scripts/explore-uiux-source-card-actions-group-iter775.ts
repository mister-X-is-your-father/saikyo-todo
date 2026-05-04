/**
 * Phase 6.15 loop iter 775 (mode-D Desktop a11y) —
 * integrations-panel SourceCard 操作 group の aria-label に enabled state を含めて拡張。
 * iter746-race workflows-panel と同 pattern を Source actions group に展開。
 *
 * 課題: integrations-panel.tsx 行 147-150 の `<div role="group" aria-label="Source の操作 (pull / 編集 / 有効化切替 / 削除)">` は静的で現在 enabled / disabled が group focus 時に分からない。各 button (有効化 toggle 含む) の aria-label には個別 state が反映されているが group summary がない (iter746race / iter744-745 と同 pattern)。
 *
 * fix (1 ファイル ~1 行差分):
 *   - aria-label を `Source「${src.name}」の操作 (現在: ${enabled ? '有効' : '無効'}、pull / 編集 / 有効化切替 / 削除)` に動的化
 *
 * 検証: source-side regex assert + iter735-774 invariant cross-check。
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
  if (
    /aria-label=\{`Source「\$\{src\.name\}」の操作 \(現在: \$\{src\.enabled \? '有効' : '無効'\}、pull \/ 編集 \/ 有効化切替 \/ 削除\)`\}/.test(
      ip,
    )
  ) {
    findings.push({
      level: 'info',
      message: `integrations SourceCard actions group aria-label 動的化 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `integrations SourceCard actions group aria-label 動的化 不完全`,
    })
  }

  // iter774 invariant: mock-submit Submit button aria-busy
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

  // iter772 invariant: tmpl-kind select required
  const tp = readFileSync(
    resolve(process.cwd(), 'src/components/template/templates-panel.tsx'),
    'utf8',
  )
  if (
    /id="tmpl-kind"\s*\n\s*value=\{kind\}/.test(tp) &&
    /required\s*\n\s*aria-required="true"/.test(tp)
  ) {
    findings.push({
      level: 'info',
      message: `iter772 invariant: tmpl-kind select required 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter772 invariant: 破壊` })
  }

  // iter752 invariant: backlog-view empty state
  const bv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )
  if (/role="status"\s*\n\s*aria-live="polite"/.test(bv)) {
    findings.push({
      level: 'info',
      message: `iter752 invariant: backlog-view empty state 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter752 invariant: 破壊` })
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

  console.log(`\n=== Findings (source-card-actions-group-iter775) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
