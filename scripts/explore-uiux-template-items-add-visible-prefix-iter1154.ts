/**
 * Phase 6.15 loop iter1154: template-items-editor add button aria-label visible-prefix regression guard。
 *
 * iter1154 で発見した visible-prefix 漏れ: template-items-editor.tsx の add 子 Item button
 * (visible "+ 追加") の旧 aria-label 3 path とも visible "+ 追加" を冒頭に持たず
 * ('子 Item を ...' 始まり) voice control prefix-matching「click + 追加 / 追加」 match 不可
 * (substring 一致のみ)。iter1093-1153 sweep convention が漏れていた。
 *
 * 修正 (template-items-editor.tsx): visible "+ 追加" 冒頭固定 + em-dash 区切で descriptive 末尾保持
 *   - not-trim: `+ 追加 — 子 Item を追加するにはタイトルを入力してください`
 *   - pending:  `+ 追加 — 子 Item を追加中…`
 *   - default:  `+ 追加 — 子 Item を Template に追加`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-template-items-add-visible-prefix-iter1154.ts
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
  const filePath = resolve(here, '../src/components/template/template-items-editor.tsx')
  const src = readFileSync(filePath, 'utf8')

  for (const expected of [
    "'+ 追加 — 子 Item を追加するにはタイトルを入力してください'",
    "'+ 追加 — 子 Item を追加中…'",
    "'+ 追加 — 子 Item を Template に追加'",
  ]) {
    if (!src.includes(expected)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `template add button: 新 visible-prefix ${expected} が source に無い`,
      })
    }
  }
  for (const oldLbl of [
    "'子 Item を追加するにはタイトルを入力してください'",
    "'子 Item を追加中…'",
    "'子 Item を Template に追加'",
  ]) {
    if (src.includes(oldLbl)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `template add button: 旧 prefix-less ${oldLbl} が残存`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — template-items-editor add button aria-label は visible "+ 追加" 冒頭固定済',
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
