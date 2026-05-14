/**
 * Phase 6.15 loop iter 857 (mode-D Desktop a11y) —
 * operation-board-widget 昨日 done toggle button visible "昨日 done N 件" を aria-hidden span で wrap。
 *
 * 課題: src/components/workspace/operation-board-widget.tsx 行 308 の toggle button は
 *   - aria-label: "昨日 done ${count} 件の一覧を{表示/閉じる}" (完全 content)
 *   - visible: "昨日 done {count} 件" (aria-hidden 無し)
 *   button aria-label が visible 内容を抑制するため SR は aria-label のみ読むが、
 *   defensive に visible を aria-hidden span で wrap、iter844-856 と同 sweep pattern を完成。
 *
 * fix (1 ファイル ~1 行差分):
 *   - visible "昨日 done {count} 件" を <span aria-hidden="true"> で wrap、aria-label 単独経路に統一
 *   - Chevron / CheckCircle2 の既存 aria-hidden 維持
 *
 * 検証: source-side regex assert + iter735-856 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const op = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )

  // 1. 昨日 done toggle button 内 visible は aria-hidden span で wrap
  if (/<span aria-hidden="true">昨日 done \{board\.doneYesterday\.count\} 件<\/span>/.test(op)) {
    findings.push({
      level: 'info',
      message: `op-board 昨日 done visible span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `op-board 昨日 done visible aria-hidden 未統合`,
    })
  }

  // 2. button aria-label 維持 (表示 / 閉じる 両状態)
  if (
    /aria-label=\{[\s\S]+?`昨日 done \$\{board\.doneYesterday\.count\} 件の一覧を閉じる`[\s\S]+?`昨日 done \$\{board\.doneYesterday\.count\} 件の一覧を表示`/.test(
      op,
    )
  ) {
    findings.push({
      level: 'info',
      message: `op-board 昨日 done aria-label (両状態) 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `op-board 昨日 done aria-label regression`,
    })
  }

  // 3. Chevron / CheckCircle2 aria-hidden 維持
  const chevAriaHidden = op.match(/<Chevron(Down|Right)[^/]+aria-hidden="true"/g) ?? []
  const checkCircleAriaHidden = op.match(/<CheckCircle2[^/]+aria-hidden="true"/g) ?? []
  if (chevAriaHidden.length >= 2 && checkCircleAriaHidden.length >= 1) {
    findings.push({
      level: 'info',
      message: `op-board icon aria-hidden 維持 OK (Chevron ${chevAriaHidden.length} / CheckCircle ${checkCircleAriaHidden.length})`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `op-board icon aria-hidden 破壊`,
    })
  }

  // 4. iter856 invariant: op-board Quick wins / 集中ブロック span aria-hidden
  const estMinHidden =
    op.match(/text-muted-foreground text-\[10px\] tabular-nums"\n\s+aria-hidden="true"/g) ?? []
  const titleHidden = op.match(/<span className="truncate" aria-hidden="true">/g) ?? []
  if (estMinHidden.length >= 2 && titleHidden.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter856 invariant: op-board tactic span aria-hidden 維持 OK (est ${estMinHidden.length} / title ${titleHidden.length})`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter856 invariant: 破壊` })
  }

  // 5. iter855 invariant: picker option aria-hidden
  const tp = readFileSync(resolve(process.cwd(), 'src/components/workspace/tag-picker.tsx'), 'utf8')
  const ap = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/assignee-picker.tsx'),
    'utf8',
  )
  const apLabelHidden = ap.match(/<span aria-hidden="true">\{label\}<\/span>/g) ?? []
  if (/<span aria-hidden="true">\{t\.name\}<\/span>/.test(tp) && apLabelHidden.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter855 invariant: picker option aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter855 invariant: 破壊` })
  }

  // 6. iter735 invariant: team-context-editor aria-keyshortcuts
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

  console.log(`\n=== Findings (op-board-done-yesterday-aria-hidden-iter857) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
