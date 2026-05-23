/**
 * Phase 6.15 loop iter1159: item-decompose-button aria-label visible-prefix regression guard。
 *
 * iter1159 で発見した visible-prefix 漏れ: item-decompose-button.tsx
 * `decompose-btn-${id}` button (visible "{pending? '分解中…' : 'AI 分解'}") の
 * 旧 aria-label 3 path とも visible を中位置 ("ため AI 分解 不可" / "を AI 分解中…")
 * に持ち voice control prefix-matching「click AI 分解 / 分解中…」 match 不可
 * (substring 一致のみ)。iter1093-1158 sweep convention が漏れていた。
 *
 * 修正 (item-decompose-button.tsx): visible 冒頭固定 + em-dash 区切で descriptive 末尾
 *   - done:    `AI 分解 — 「${item.title}」は完了済のため AI 分解不可`
 *   - pending: `分解中… — 「${item.title}」を AI 分解中…`
 *   - default: `AI 分解 — 「${item.title}」を AI 分解 (子タスクを 3〜5 件作成)`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-decompose-btn-visible-prefix-iter1159.ts
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
  const filePath = resolve(here, '../src/components/workspace/item-decompose-button.tsx')
  const src = readFileSync(filePath, 'utf8')

  for (const expected of [
    '`AI 分解 — 「${item.title}」は完了済のため AI 分解不可`',
    '`分解中… — 「${item.title}」を AI 分解中…`',
    '`AI 分解 — 「${item.title}」を AI 分解 (子タスクを 3〜5 件作成)`',
  ]) {
    if (!src.includes(expected)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `decompose-btn: 新 visible-prefix ${expected} が source に無い`,
      })
    }
  }
  for (const oldLbl of [
    '`「${item.title}」は完了済のため AI 分解不可`',
    '`「${item.title}」を AI 分解中…`',
    '`「${item.title}」を AI 分解 (子タスクを 3〜5 件作成)`',
  ]) {
    if (src.includes(oldLbl)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `decompose-btn: 旧 prefix-less ${oldLbl} が残存`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — decompose-btn aria-label 3 path とも visible 冒頭固定済')
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
