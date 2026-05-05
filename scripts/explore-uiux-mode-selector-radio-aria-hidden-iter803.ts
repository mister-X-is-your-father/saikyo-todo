/**
 * Phase 6.15 loop iter 803 (mode-D Desktop a11y) —
 * workspace-mode-selector radio button 内の visible label / description span を
 * aria-hidden 化。
 *
 * 課題: workspace-mode-selector.tsx 行 151-162 の radio button (3 種: none /
 *   taskchute / gtd) は parent button に aria-label (`${opt.label}: ${opt.description}`)
 *   が完全 content を含むのに、内側 visible span (label + description) には
 *   aria-hidden 無し。SR ユーザは button focus で aria-label を聞いた後、内側
 *   text も再度読み上げされて重複だった。Icon は aria-hidden 済 (line 154)。
 *   iter800 / iter801 / iter802 と同 pattern。
 *
 * fix (1 ファイル ~7 行差分):
 *   - label container div に aria-hidden="true" 移動 (Icon の hidden は
 *     親で吸収されるので個別 aria-hidden 不要、簡潔化)
 *   - description span に aria-hidden="true" 追加
 *
 * 検証: source-side regex assert + iter735-802 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const wms = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/workspace-mode-selector.tsx'),
    'utf8',
  )
  const hasContainerAriaHidden =
    /<div className="flex items-center gap-1\.5" aria-hidden="true">/.test(wms)
  const hasDescAriaHidden =
    /text-muted-foreground text-\[11px\] leading-tight"\s*\n?\s*aria-hidden="true"/.test(wms)
  if (hasContainerAriaHidden && hasDescAriaHidden) {
    findings.push({
      level: 'info',
      message: `workspace-mode-selector radio button visible content aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `workspace-mode-selector radio aria-hidden 不完全 (container=${hasContainerAriaHidden} desc=${hasDescAriaHidden})`,
    })
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

  // iter800 invariant: tag-picker trigger inner aria-hidden
  const tp = readFileSync(resolve(process.cwd(), 'src/components/workspace/tag-picker.tsx'), 'utf8')
  if (
    /<span className="text-muted-foreground" aria-hidden="true">\s*\n?\s*タグなし\s*\n?\s*<\/span>/.test(
      tp,
    ) &&
    /<span className="flex flex-wrap gap-1" aria-hidden="true">/.test(tp)
  ) {
    findings.push({
      level: 'info',
      message: `iter800 invariant: tag-picker trigger inner aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter800 invariant: 破壊` })
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

  console.log(`\n=== Findings (mode-selector-radio-aria-hidden-iter803) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
