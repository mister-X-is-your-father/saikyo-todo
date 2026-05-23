/**
 * Phase 6.15 loop iter1185: item-edit-dialog edit-item-kr select aria-label visible-prefix
 * regression guard (3 path)。
 *
 * iter1185 で発見した visible-prefix 漏れ (edit-item-sprint iter1184 同 pattern):
 * item-edit-dialog.tsx `edit-item-kr` select の旧 aria-label 3 path とも visible (option text =
 * {current.title} / "未割当") を中位置に持ち voice control prefix-matching「click {title} / 未割当」
 * match 不可。pending path は visible 不含で WCAG 2.5.3 違反継続。
 *
 * 修正 (item-edit-dialog.tsx): IIFE で visible を先に算出し全 path で visible 冒頭固定 +
 * em-dash 区切で descriptive 末尾。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-edit-item-kr-visible-prefix-iter1185.ts
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
    '`${visible} — Key Result 割当を更新中…`',
    '`${visible} — Key Result「${current.title}」(Goal「${current.goalTitle}」) に割当中 (変更で別 KR へ移動)`',
    "'未割当 — Key Result 未割当 (選択で稼働中 Goal の KR に割当)'",
  ]) {
    if (!src.includes(expected)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `edit-item-kr: 新 visible-prefix ${expected} が source に無い`,
      })
    }
  }
  for (const oldLbl of [
    "'Key Result 割当を更新中…'",
    '`Key Result「${current.title}」(Goal「${current.goalTitle}」) に割当中 (変更で別 KR へ移動)`',
    "'Key Result 未割当 (選択で稼働中 Goal の KR に割当)'",
  ]) {
    if (src.includes(oldLbl)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `edit-item-kr: 旧 prefix-less ${oldLbl} が残存`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — edit-item-kr aria-label 3 path とも visible 冒頭固定済')
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
