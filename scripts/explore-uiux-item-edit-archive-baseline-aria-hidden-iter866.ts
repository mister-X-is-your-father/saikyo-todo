/**
 * Phase 6.15 loop iter 866 (mode-D Desktop a11y) —
 * item-edit-dialog の 4 visible button (アーカイブ復元 / アーカイブ / ベースライン記録 3 state /
 * baseline クリア) を aria-hidden span で wrap.
 *
 * 課題: src/components/workspace/item-edit-dialog.tsx の DialogFooter 内 4 button:
 *   - アーカイブ復元 (行 798-800、2 state)
 *   - アーカイブ (行 827-829、2 state)
 *   - ベースライン記録 (行 868-873、3 state: 記録中 / 更新 / 記録)
 *   - baseline クリア (行 902-904、2 state)
 * 各々 aria-label が完全 content (Item title + action + 補足) を含むのに、内側 visible text は
 * aria-hidden 無し → SR ユーザに重複読み上げ。iter844-865 sweep の続編で 4 callsite 一括対応。
 * これで item-edit-dialog footer の主要 button (iter839 save/cancel + iter840 template +
 * iter843 reload + iter866 archive/baseline 4) で a11y 規約完成。
 *
 * fix (1 file ~7 行差分、4 callsite):
 *   - 各 button 内 visible label を <span aria-hidden="true"> で wrap
 *   - 動的 label (2 state / 3 state) も span 内に展開
 *   - 既存 aria-label / data-testid / disabled / aria-busy 維持
 *
 * 検証: source-side regex assert + iter735-865 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )

  // 1. アーカイブ復元 (2 state)
  if (
    /<span aria-hidden="true">\{unarchive\.isPending \? '復元中…' : 'アーカイブ復元'\}<\/span>/.test(
      ied,
    )
  ) {
    findings.push({
      level: 'info',
      message: `item-edit アーカイブ復元 visible (2 state) aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `item-edit アーカイブ復元 aria-hidden 未統合`,
    })
  }

  // 2. アーカイブ (2 state)
  if (
    /<span aria-hidden="true">\{archive\.isPending \? 'アーカイブ中…' : 'アーカイブ'\}<\/span>/.test(
      ied,
    )
  ) {
    findings.push({
      level: 'info',
      message: `item-edit アーカイブ visible (2 state) aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `item-edit アーカイブ aria-hidden 未統合`,
    })
  }

  // 3. ベースライン記録 (3 state)
  if (
    /<span aria-hidden="true">\n\s+\{setBaseline\.isPending\n\s+\? '記録中…'\n\s+: item\.baselineStartDate\n\s+\? 'ベースライン更新'\n\s+: 'ベースライン記録'\}\n\s+<\/span>/.test(
      ied,
    )
  ) {
    findings.push({
      level: 'info',
      message: `item-edit ベースライン記録 visible (3 state) aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `item-edit ベースライン記録 aria-hidden 未統合`,
    })
  }

  // 4. baseline クリア (2 state)
  if (
    /<span aria-hidden="true">\n\s+\{clearBaseline\.isPending \? 'クリア中…' : 'baseline クリア'\}\n\s+<\/span>/.test(
      ied,
    )
  ) {
    findings.push({
      level: 'info',
      message: `item-edit baseline クリア visible (2 state) aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `item-edit baseline クリア aria-hidden 未統合`,
    })
  }

  // 5. 各 button aria-label 維持
  const ariaLabels = [
    /aria-label=\{[\s\S]+?`「\$\{item\.title\}」をアーカイブから復元`/.test(ied),
    /aria-label=\{[\s\S]+?`「\$\{item\.title\}」をアーカイブ \(後で復元可能\)`/.test(ied),
    /aria-label=\{[\s\S]+?`「\$\{item\.title\}」の startDate \/ dueDate を当初計画 \(baseline\) として保存`/.test(
      ied,
    ),
    /aria-label=\{[\s\S]+?`「\$\{item\.title\}」のベースライン \(\$\{item\.baselineStartDate\} → \$\{item\.baselineEndDate\}\) をクリア`/.test(
      ied,
    ),
  ]
  if (ariaLabels.every(Boolean)) {
    findings.push({
      level: 'info',
      message: `item-edit 4 button aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `item-edit aria-label regression (${ariaLabels.filter(Boolean).length}/4)`,
    })
  }

  // 6. iter865 invariant: 3 view title aria-hidden
  const kv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/kanban-view.tsx'),
    'utf8',
  )
  const tcv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/taskchute-view.tsx'),
    'utf8',
  )
  const ppv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/personal-period-view.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{item\.title\}<\/span>/.test(kv) &&
    /<span aria-hidden="true">\{item\.title\}<\/span>/.test(tcv) &&
    /<span aria-hidden="true">\{it\.title\}<\/span>/.test(ppv)
  ) {
    findings.push({
      level: 'info',
      message: `iter865 invariant: 3 view title aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter865 invariant: 破壊` })
  }

  // 7. iter735 invariant: team-context-editor aria-keyshortcuts
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

  console.log(`\n=== Findings (item-edit-archive-baseline-aria-hidden-iter866) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
