/**
 * Phase 6.15 loop iter 804 (mode-D Desktop a11y) —
 * activity-log の hint chip / top-actor chip 内 visible text を aria-hidden 化
 * (dashboard-chip canonical pattern: aria-label 経路に統一)。
 *
 * 課題: activity-log.tsx 行 104-123 の 2 chip (Activity 状態 hint / topActor) は
 *   parent <span> に aria-label が付いているのに、内側 visible text は aria-hidden
 *   無し。SR ユーザは aria-label を聞いた後 visible text が再度読み上げられる
 *   AT 実装ありで重複可能性。dashboard-chip.tsx (canonical) は visible text を
 *   `<span aria-hidden="true">{text}</span>` で wrap する pattern を採用。
 *   iter800-803 と同 inner aria-hidden sweep。
 *
 * fix (1 ファイル ~6 行差分、2 chip 各々の visible text を aria-hidden span に wrap):
 *   - hint chip 内 {hint.label} を <span aria-hidden="true"> で wrap
 *   - topActor chip 内 "⭐ {formatTopActorJa(topActor)}" を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter735-803 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const al = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/activity-log.tsx'),
    'utf8',
  )
  const hasHintAriaHidden = /<span aria-hidden="true">\{hint\.label\}<\/span>/.test(al)
  const hasTopActorAriaHidden =
    /<span aria-hidden="true">⭐ \{formatTopActorJa\(topActor\)\}<\/span>/.test(al)
  if (hasHintAriaHidden && hasTopActorAriaHidden) {
    findings.push({
      level: 'info',
      message: `activity-log hint + top-actor chip visible text aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `activity-log chip aria-hidden 不完全 (hint=${hasHintAriaHidden} topActor=${hasTopActorAriaHidden})`,
    })
  }

  // iter803 invariant: workspace-mode-selector radio inner aria-hidden
  const wms = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/workspace-mode-selector.tsx'),
    'utf8',
  )
  if (
    /<div className="flex items-center gap-1\.5" aria-hidden="true">/.test(wms) &&
    /text-muted-foreground text-\[11px\] leading-tight"\s*\n?\s*aria-hidden="true"/.test(wms)
  ) {
    findings.push({
      level: 'info',
      message: `iter803 invariant: workspace-mode-selector radio inner aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter803 invariant: 破壊` })
  }

  // iter802 invariant: inbox-view GTD chip aria-hidden
  const iv = readFileSync(resolve(process.cwd(), 'src/components/workspace/inbox-view.tsx'), 'utf8')
  if (
    /text-emerald-700"\s*\n\s*aria-hidden="true"/.test(iv) &&
    /text-sky-700"\s*\n\s*aria-hidden="true"/.test(iv) &&
    /text-slate-700"\s*\n\s*aria-hidden="true"/.test(iv)
  ) {
    findings.push({
      level: 'info',
      message: `iter802 invariant: inbox-view GTD chip aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter802 invariant: 破壊` })
  }

  // iter801 invariant: assignee-picker trigger inner aria-hidden
  const ap = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/assignee-picker.tsx'),
    'utf8',
  )
  if (
    /<span className="text-muted-foreground" aria-hidden="true">\s*\n?\s*未アサイン\s*\n?\s*<\/span>/.test(
      ap,
    ) &&
    /<span className="truncate" aria-hidden="true">/.test(ap)
  ) {
    findings.push({
      level: 'info',
      message: `iter801 invariant: assignee-picker trigger inner aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter801 invariant: 破壊` })
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

  console.log(`\n=== Findings (activity-log-chip-aria-hidden-iter804) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
