/**
 * Phase 6.15 loop iter1302: item-edit-dialog.tsx item-edit-save-as-template button aria-label
 * visible-prefix + voice control prefix-matching regression guard。
 *
 * iter1302 で発見した visible-prefix 違反: item-edit-dialog.tsx `item-edit-save-as-template`
 * Button (ItemEditDialog footer 左側「Template として保存」 button) の旧 aria-label 2 path とも
 * visible "Template として保存" / "保存中…" を中位置 (`「title」を **Template に保存中…**` /
 * `「title」と全ての子孫 (subtask) を **Template として保存**`) に持ち、voice control
 * prefix-matching「click Template として保存 / 保存中…」 match 不可 (substring 一致のみ)。
 *
 * iter1093-1207 sweep convention (visible 冒頭 + em-dash 区切で descriptive 末尾) に揃える。
 *
 * 修正 (item-edit-dialog.tsx):
 *   - 旧 pending: `「${item.title}」を Template に保存中…`
 *   - 旧 default: `「${item.title}」と全ての子孫 (subtask) を Template として保存 (再利用可)`
 *   - 新 pending: `保存中… — 「${item.title}」を Template に保存中`
 *   - 新 default: `Template として保存 — 「${item.title}」と全ての子孫 (subtask) を Template として保存 (再利用可)`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-save-as-template-visible-prefix-iter1302.ts
 * 前提: なし (source 直読 invariant)
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
  const filePath = resolve(here, '../src/components/workspace/item-edit-dialog.tsx')
  const src = readFileSync(filePath, 'utf8')

  // 新 template literal が存在することを確認 (両 path)
  if (!src.includes('`保存中… — 「${item.title}」を Template に保存中`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message:
        'item-edit-save-as-template aria-label pending path が visible "保存中…" 冒頭固定 convention で無い',
    })
  }
  if (
    !src.includes(
      '`Template として保存 — 「${item.title}」と全ての子孫 (subtask) を Template として保存 (再利用可)`',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message:
        'item-edit-save-as-template aria-label default path が visible "Template として保存" 冒頭固定 convention で無い',
    })
  }

  // 旧 template literal の active code 残存を確認 (comment 内の言及は除外)
  const codeOnly = src
    .split('\n')
    .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
    .join('\n')
  if (codeOnly.includes('`「${item.title}」を Template に保存中…`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message:
        '旧 aria-label pending `「${item.title}」を Template に保存中…` (visible "保存中…" 末尾持ち) が active code に残存',
    })
  }
  if (
    codeOnly.includes('`「${item.title}」と全ての子孫 (subtask) を Template として保存 (再利用可)`')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message:
        '旧 aria-label default `「${item.title}」と全ての子孫 (subtask) を Template として保存 (再利用可)` (visible "Template として保存" 末尾持ち) が active code に残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — item-edit-save-as-template button aria-label は visible "Template として保存" / "保存中…" 冒頭固定 (voice control prefix-match satisfy)',
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
