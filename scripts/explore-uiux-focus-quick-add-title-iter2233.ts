/**
 * Phase 6.15 loop iter2233: FocusQuickAddButton に title 付与し aria-label と sync
 * (FocusFormCta iter2199 と pair の empty-state CTA 2 element 完成、
 * 3 caller today/inbox/items-board で一括効果)。
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

interface Finding {
  level: 'error' | 'warning' | 'info'
  source: string
  message: string
}

async function main() {
  const findings: Finding[] = []
  const here = dirname(fileURLToPath(import.meta.url))

  const fqab = readFileSync(
    resolve(here, '../src/components/workspace/focus-quick-add-button.tsx'),
    'utf8',
  )
  if (
    !fqab.includes('iter2233') ||
    !fqab.includes(
      'title="クイック追加にフォーカス (キー: q) — quick-add input にフォーカスして即タスク入力"',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'FocusQuickAddButton title が aria-label と sync されていない',
    })
  }
  // title と aria-label が 1 セットずつ存在 (同 text)
  const ariaCount = (fqab.match(/クイック追加にフォーカス \(キー: q\)/g) || []).length
  if (ariaCount < 3) {
    // aria-label 1 + visible span 1 + title 1 = 3 出現
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `'クイック追加にフォーカス (キー: q)' 出現が ${ariaCount} 回、aria-label + span + title 計 3 回必要`,
    })
  }

  const ffcta = readFileSync(resolve(here, '../src/components/shared/focus-form-cta.tsx'), 'utf8')
  if (!ffcta.includes('iter2199')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2199 FocusFormCta title が消えている',
    })
  }

  const rb = readFileSync(
    resolve(here, '../src/components/workspace/item-research-button.tsx'),
    'utf8',
  )
  if (!rb.includes('iter2231')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2231 item-research-button title が消えている',
    })
  }

  const wh = readFileSync(resolve(here, '../src/components/workspace/workspace-header.tsx'), 'utf8')
  if (!wh.includes('iter2229') || !wh.includes('iter2227')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2227/2229 workspace-header title が消えている',
    })
  }

  const mustBadge = readFileSync(
    resolve(here, '../src/components/workspace/must-badge.tsx'),
    'utf8',
  )
  if (!mustBadge.includes('title="MUST タスク"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1843 MustBadge title が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — FocusQuickAddButton title sync 完了、empty-state CTA pair 2 element 完成 (focus-quick-add / focus-form-cta)',
    )
  } else {
    for (const f of findings) console.log(`  [${f.level}/${f.source}] ${f.message}`)
  }
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
