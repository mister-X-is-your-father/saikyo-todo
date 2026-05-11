/**
 * Phase 6.15 loop iter 855 (mode-D Desktop a11y) —
 * item-edit-dialog アーカイブ復元 / アーカイブ button:
 * WCAG 2.5.3 (Label in Name) 適合 + iter844-854 pattern 統一。
 *
 * 課題:
 *  1. アーカイブ復元 button (item-edit-unarchive) idle visible "アーカイブ復元"
 *     は aria-label "「title」をアーカイブから復元" の strict substring に
 *     **ならない** (= 助詞 "から" 1 単語挟んで 「アーカイブから復元」 で連続せず)。
 *     visible "復元中…" pending path は substring OK だが path 不揃い回避。
 *  2. アーカイブ button (item-edit-archive) idle visible "アーカイブ" + pending
 *     "アーカイブ中…" は aria-label substring を満たすが、隣接 unarchive と
 *     pattern 不揃いを避け iter844-854 同 vocabulary に統一。
 *
 * fix (1 ファイル ~6 行差分):
 *   - 両 button visible 全 path を <span aria-hidden="true"> で wrap、
 *     aria-label 単独経路に統一 (iter844-854 同 pattern)。
 *   - aria-label の archive 文脈 (後で復元可能 hint) 維持。
 *
 * 検証: source-side regex assert + iter735-854 invariant cross-check。
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

  // 1. unarchive button visible は aria-hidden span で wrap
  if (
    /<span aria-hidden="true">\s*\{unarchive\.isPending \? '復元中…' : 'アーカイブ復元'\}\s*<\/span>/.test(
      ied,
    )
  ) {
    findings.push({
      level: 'info',
      message: `item-edit-unarchive visible aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `item-edit-unarchive visible aria-hidden 未統合`,
    })
  }

  // 2. archive button visible は aria-hidden span で wrap
  if (
    /<span aria-hidden="true">\s*\{archive\.isPending \? 'アーカイブ中…' : 'アーカイブ'\}\s*<\/span>/.test(
      ied,
    )
  ) {
    findings.push({
      level: 'info',
      message: `item-edit-archive visible aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `item-edit-archive visible aria-hidden 未統合`,
    })
  }

  // 3. data-testid 維持
  if (
    /data-testid="item-edit-unarchive"/.test(ied) &&
    /data-testid="item-edit-archive"/.test(ied)
  ) {
    findings.push({
      level: 'info',
      message: `archive/unarchive data-testid 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `archive/unarchive data-testid 破壊` })
  }

  // 4. unarchive aria-label 文脈 維持
  if (/`「\$\{item\.title\}」をアーカイブから復元`/.test(ied)) {
    findings.push({
      level: 'info',
      message: `unarchive aria-label (アーカイブから復元) 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `unarchive aria-label 文脈破壊` })
  }

  // 5. archive aria-label 文脈 (復元可能 hint) 維持
  if (/`「\$\{item\.title\}」をアーカイブ \(後で復元可能\)`/.test(ied)) {
    findings.push({
      level: 'info',
      message: `archive aria-label (後で復元可能 hint) 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `archive aria-label 文脈破壊` })
  }

  // iter854 invariant: set-baseline visible aria-hidden
  if (
    /<span aria-hidden="true">\s*\{setBaseline\.isPending\s*\?\s*'記録中…'\s*:\s*item\.baselineStartDate\s*\?\s*'ベースライン更新'\s*:\s*'ベースライン記録'\}\s*<\/span>/.test(
      ied,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter854 invariant: set-baseline visible aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter854 invariant 破壊` })
  }

  // iter853 invariant: sprint-retro visible aria-hidden
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\s*\{retroPending \? '振り返り生成中…' : '振り返り生成'\}\s*<\/span>/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter853 invariant: sprint-retro visible aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter853 invariant 破壊` })
  }

  // iter735 invariant: team-context-editor aria-keyshortcuts
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

  console.log(`\n=== Findings (item-edit-archive-aria-hidden-iter855) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
