/**
 * Phase 6.15 loop iter1178: item-edit-dialog item-edit-archive button aria-label visible-prefix
 * regression guard。
 *
 * iter1178 で発見した visible-prefix 漏れ: item-edit-dialog.tsx `item-edit-archive` button
 * (visible "{pending? 'アーカイブ中…' : 'アーカイブ'}") の旧 aria-label 2 path とも visible
 * を中位置 "「title」を **アーカイブ**" / "「title」を **アーカイブ中…**" に持ち voice control
 * prefix-matching「click アーカイブ / アーカイブ中…」 match 不可 (substring 一致のみ)。
 * iter1074 unarchive 同 pattern を archive 側にも展開すべきだったが漏れていた。
 *
 * 修正 (item-edit-dialog.tsx): visible 冒頭固定 + em-dash 区切で descriptive 末尾保持
 *   - pending: `アーカイブ中… — 「${item.title}」をアーカイブ中…`
 *   - default: `アーカイブ — 「${item.title}」をアーカイブ (後で復元可能)`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-item-edit-archive-visible-prefix-iter1178.ts
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

  for (const expected of [
    '`アーカイブ中… — 「${item.title}」をアーカイブ中…`',
    '`アーカイブ — 「${item.title}」をアーカイブ (後で復元可能)`',
  ]) {
    if (!src.includes(expected)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `item-edit-archive: 新 visible-prefix ${expected} が source に無い`,
      })
    }
  }
  for (const oldLbl of [
    '`「${item.title}」をアーカイブ中…`',
    '`「${item.title}」をアーカイブ (後で復元可能)`',
  ]) {
    if (src.includes(oldLbl)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `item-edit-archive: 旧 prefix-less ${oldLbl} が残存`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — item-edit-archive aria-label 2 path とも visible 冒頭固定済')
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
