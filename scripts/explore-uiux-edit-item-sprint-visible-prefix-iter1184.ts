/**
 * Phase 6.15 loop iter1184: item-edit-dialog edit-item-sprint select aria-label visible-prefix
 * regression guard (3 path)。
 *
 * iter1184 で発見した visible-prefix 漏れ: item-edit-dialog.tsx `edit-item-sprint` select の
 * aria-label 3 path とも visible (option text = {current.name} / "未割当") を中位置に持ち voice
 * control prefix-matching「click {name} / 未割当」 match 不可 (substring 一致のみ)。
 * pending path は visible を含まず WCAG 2.5.3 Label in Name 違反継続。
 *
 * 修正 (item-edit-dialog.tsx): IIFE で visible を先に算出し全 path で visible 冒頭固定
 *   - pending:  `${visible} — Sprint 割当を更新中…`
 *   - current:  `${visible} — Sprint「${current.name}」に割当中 (変更で別 Sprint へ移動)`
 *   - !current: `未割当 — Sprint 未割当 (選択で稼働中 / 計画中 Sprint に割当)`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-edit-item-sprint-visible-prefix-iter1184.ts
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
    '`${visible} — Sprint 割当を更新中…`',
    '`${visible} — Sprint「${current.name}」に割当中 (変更で別 Sprint へ移動)`',
    "'未割当 — Sprint 未割当 (選択で稼働中 / 計画中 Sprint に割当)'",
  ]) {
    if (!src.includes(expected)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `edit-item-sprint: 新 visible-prefix ${expected} が source に無い`,
      })
    }
  }
  for (const oldLbl of [
    "'Sprint 割当を更新中…'",
    '`Sprint「${current.name}」に割当中 (変更で別 Sprint へ移動)`',
    "'Sprint 未割当 (選択で稼働中 / 計画中 Sprint に割当)'",
  ]) {
    if (src.includes(oldLbl)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `edit-item-sprint: 旧 prefix-less ${oldLbl} が残存`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — edit-item-sprint aria-label 3 path とも visible 冒頭固定済')
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
