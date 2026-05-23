/**
 * Phase 6.15 loop iter1160: item-research-button aria-label visible-prefix regression guard。
 *
 * iter1160 で発見した visible-prefix 漏れ: item-research-button.tsx
 * `research-btn-${id}` button (visible "{pending? '調査中…' : 'AI 調査'}") の
 * 旧 aria-label 3 path とも visible を中位置 ("ため AI 調査 不可" / "を AI 調査中…")
 * に持ち voice control prefix-matching「click AI 調査 / 調査中…」 match 不可
 * (substring 一致のみ)。iter1159 item-decompose-button と同 sweep。
 *
 * 修正 (item-research-button.tsx): visible 冒頭固定 + em-dash 区切で descriptive 末尾
 *   - done:    `AI 調査 — 「${item.title}」は完了済のため AI 調査不可`
 *   - pending: `調査中… — 「${item.title}」を AI 調査中…`
 *   - default: `AI 調査 — 「${item.title}」を AI 調査して Doc を作成`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-research-btn-visible-prefix-iter1160.ts
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
  const filePath = resolve(here, '../src/components/workspace/item-research-button.tsx')
  const src = readFileSync(filePath, 'utf8')

  for (const expected of [
    '`AI 調査 — 「${item.title}」は完了済のため AI 調査不可`',
    '`調査中… — 「${item.title}」を AI 調査中…`',
    '`AI 調査 — 「${item.title}」を AI 調査して Doc を作成`',
  ]) {
    if (!src.includes(expected)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `research-btn: 新 visible-prefix ${expected} が source に無い`,
      })
    }
  }
  for (const oldLbl of [
    '`「${item.title}」は完了済のため AI 調査不可`',
    '`「${item.title}」を AI 調査中…`',
    '`「${item.title}」を AI 調査して Doc を作成`',
  ]) {
    if (src.includes(oldLbl)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `research-btn: 旧 prefix-less ${oldLbl} が残存`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — research-btn aria-label 3 path とも visible 冒頭固定済')
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
