/**
 * Phase 6.15 loop iter 853 (mode-D Desktop a11y) —
 * item-edit-dialog アーカイブ button: visible "アーカイブ" / "アーカイブ中…" を
 * span aria-hidden で wrap、aria-label 単独経路に統一。
 *
 * 課題: src/components/workspace/item-edit-dialog.tsx の DialogFooter にある
 *   item-edit-archive button は aria-label "「{title}」をアーカイブ (後で復元可能)" /
 *   "「{title}」をアーカイブ中…" が visible "アーカイブ" / "アーカイブ中…" を完全
 *   含むため WCAG 2.5.3 (Label in Name) は適合だったが、iter844-852 campaign
 *   (visible text を span aria-hidden で wrap、aria-label 単独経路) の規約から
 *   外れていた footer 4 button のうち最も単純なケース。
 *
 * fix (1 ファイル / +3-1 行差分):
 *   - <Button>{archive.isPending ? 'アーカイブ中…' : 'アーカイブ'}</Button> →
 *     <Button><span aria-hidden="true">{...}</span></Button>
 *
 * 検証: source-side regex assert + iter849-852 invariant cross-check。
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

  // 1. visible "アーカイブ中…" / "アーカイブ" は span aria-hidden で wrap (両状態統合)
  if (
    /<span aria-hidden="true">\s*\{archive\.isPending \? 'アーカイブ中…' : 'アーカイブ'\}\s*<\/span>/.test(
      ied,
    )
  ) {
    findings.push({
      level: 'info',
      message: `item-edit-archive visible text span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `item-edit-archive visible text aria-hidden 未統合`,
    })
  }

  // 2. aria-label 維持 (両状態)
  if (
    /aria-label=\{[\s\S]+?archive\.isPending[\s\S]+?「\$\{item\.title\}」をアーカイブ中…[\s\S]+?「\$\{item\.title\}」をアーカイブ \(後で復元可能\)/.test(
      ied,
    )
  ) {
    findings.push({
      level: 'info',
      message: `item-edit-archive aria-label 両状態維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `item-edit-archive aria-label 破壊`,
    })
  }

  // 3. data-testid="item-edit-archive" 維持
  if (/data-testid="item-edit-archive"/.test(ied)) {
    findings.push({
      level: 'info',
      message: `item-edit-archive data-testid 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `item-edit-archive data-testid 破壊` })
  }

  // iter852 invariant: bulk-clear visible "解除" span aria-hidden
  const bab = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/bulk-action-bar.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">解除<\/span>/.test(bab)) {
    findings.push({
      level: 'info',
      message: `iter852 invariant: bulk-clear visible "解除" aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter852 invariant: bulk-clear 破壊` })
  }

  // iter851 invariant: bulk-status visible "{s.label} に" span aria-hidden
  if (/<span aria-hidden="true">\{s\.label\} に<\/span>/.test(bab)) {
    findings.push({
      level: 'info',
      message: `iter851 invariant: bulk-status visible aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter851 invariant: bulk-status 破壊` })
  }

  // iter850 invariant: bulk-delete visible "削除" span aria-hidden
  if (/<span aria-hidden="true">削除<\/span>/.test(bab)) {
    findings.push({
      level: 'info',
      message: `iter850 invariant: bulk-delete visible "削除" aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter850 invariant: bulk-delete 破壊` })
  }

  // iter849 invariant: calendar-view 今日 button aria-hidden
  const cv = readFileSync(
    resolve(process.cwd(), 'src/components/schedule/calendar-view.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">今日<\/span>/.test(cv)) {
    findings.push({
      level: 'info',
      message: `iter849 invariant: calendar-view 今日 button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter849 invariant: calendar 破壊` })
  }

  console.log(`\n=== Findings (item-edit-archive-aria-hidden-iter853) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
