/**
 * Phase 6.15 loop iter 852 (mode-D Desktop a11y) —
 * assignee-picker / tag-picker の CommandItem visible {label} text を
 * <span aria-hidden="true"> で wrap し、aria-label 単独経路に統一。
 *
 * 経緯: iter800/801 で両 picker の trigger button visible "未アサイン" / "タグなし" を
 *   aria-hidden 化済。Popover 内の CommandItem option も同 pattern (aria-label に
 *   完全 content が含まれる: 「{label} をアサイン中 (クリックで解除)」 / 「タグ {name} を付与する」)
 *   なので visible {label} / {t.name} も aria-hidden span 化して規約統一。
 *
 * 対象: 3 箇所 (member option / agent option / tag option)
 *   - assignee-picker member option line ~149: {label}
 *   - assignee-picker agent option line ~179: {label}
 *   - tag-picker tag option line ~154: {t.name}
 *
 * 検証: source-side regex assert + iter735/843/849/850/851 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const assignee = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/assignee-picker.tsx'),
    'utf8',
  )
  const tag = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/tag-picker.tsx'),
    'utf8',
  )

  // 1. assignee-picker member option visible {label} を span aria-hidden で wrap
  const memberSpan = (assignee.match(/<span aria-hidden="true">\{label\}<\/span>/g) ?? []).length
  if (memberSpan >= 2) {
    findings.push({
      level: 'info',
      message: `assignee-picker member + agent option visible {label} 2 箇所 span aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `assignee-picker option {label} aria-hidden 未統合 (現在 ${memberSpan} 箇所)`,
    })
  }

  // 2. assignee-picker member option aria-label 完全 content 維持
  if (
    /aria-label=\{[\s\S]+?`「\$\{label\}」をアサイン中 \(クリックで解除\)`/.test(assignee) &&
    /aria-label=\{[\s\S]+?`「\$\{label\}」をアサインする`/.test(assignee)
  ) {
    findings.push({
      level: 'info',
      message: `assignee-picker member aria-label 完全 content (idle + checked) 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `assignee-picker member aria-label 破壊`,
    })
  }

  // 3. assignee-picker agent option aria-label 完全 content 維持
  if (
    /aria-label=\{[\s\S]+?`AI Agent「\$\{label\}」をアサイン中 \(クリックで解除\)`/.test(
      assignee,
    ) &&
    /aria-label=\{[\s\S]+?`AI Agent「\$\{label\}」をアサインする`/.test(assignee)
  ) {
    findings.push({
      level: 'info',
      message: `assignee-picker agent aria-label 完全 content (idle + checked) 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `assignee-picker agent aria-label 破壊`,
    })
  }

  // 4. tag-picker option visible {t.name} を span aria-hidden で wrap
  if (/<span aria-hidden="true">\{t\.name\}<\/span>/.test(tag)) {
    findings.push({
      level: 'info',
      message: `tag-picker option visible {t.name} span aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `tag-picker option {t.name} aria-hidden 未統合`,
    })
  }

  // 5. tag-picker option aria-label 完全 content 維持
  if (
    /aria-label=\{[\s\S]+?`タグ「\$\{t\.name\}」を付与中 \(クリックで解除\)`/.test(tag) &&
    /aria-label=\{[\s\S]+?`タグ「\$\{t\.name\}」を付与する`/.test(tag)
  ) {
    findings.push({
      level: 'info',
      message: `tag-picker option aria-label 完全 content (idle + checked) 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `tag-picker option aria-label 破壊`,
    })
  }

  // 6. data-testid 維持
  if (
    /data-testid=\{`assignee-option-\$\{m\.userId\}`\}/.test(assignee) &&
    /data-testid=\{`assignee-option-agent-\$\{a\.role\}`\}/.test(assignee) &&
    /data-testid=\{`tag-option-\$\{t\.id\}`\}/.test(tag)
  ) {
    findings.push({
      level: 'info',
      message: `picker option data-testid 3 種 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `picker option data-testid 破壊` })
  }

  // iter800/801 invariant: trigger 内 visible 「未アサイン」 / 「タグなし」 aria-hidden
  if (
    /<span className="text-muted-foreground" aria-hidden="true">\s*未アサイン/.test(assignee) &&
    /<span className="text-muted-foreground" aria-hidden="true">\s*タグなし/.test(tag)
  ) {
    findings.push({
      level: 'info',
      message: `iter800/801 invariant: trigger empty placeholder aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter800/801 invariant: 破壊` })
  }

  // iter851 invariant: bulk-action-bar status + 解除 button aria-hidden span
  const bab = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/bulk-action-bar.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{s\.label\} に<\/span>/.test(bab) &&
    /<span aria-hidden="true">解除<\/span>/.test(bab)
  ) {
    findings.push({
      level: 'info',
      message: `iter851 invariant: bulk-action-bar status + 解除 button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter851 invariant: 破壊` })
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

  console.log(`\n=== Findings (picker-option-label-aria-hidden-iter852) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
