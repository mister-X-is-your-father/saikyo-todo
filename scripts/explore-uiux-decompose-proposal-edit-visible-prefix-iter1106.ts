/**
 * Phase 6.15 loop iter1106: decompose-proposals-panel edit cancel/save aria-label visible-prefix
 * regression guard。
 *
 * iter1106 で発見した bug: proposal-{id}-edit-cancel + proposal-{id}-save の旧 aria-label は
 * visible "キャンセル" / "保存" / "保存中…" を末尾持ちで voice control prefix-matching match 不可。
 *
 * 修正 (decompose-proposals-panel.tsx) — 3 path visible-prefix 形式に統一:
 *   - cancel: "キャンセル — 提案「title」の編集を破棄"
 *   - save default: "保存 — 提案「title」の編集を保存 (Cmd/Ctrl+Enter でも可)"
 *   - save pending: "保存中… — 提案「title」の編集を保存中"
 *
 * 実 supabase + decompose proposal fixture 必要、Docker 不在で fallback。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-decompose-proposal-edit-visible-prefix-iter1106.ts
 * 前提: なし
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
  const filePath = resolve(here, '../src/components/workspace/decompose-proposals-panel.tsx')
  const src = readFileSync(filePath, 'utf8')

  const expected = [
    'キャンセル — 提案「${proposal.title}」の編集を破棄',
    '保存 — 提案「${proposal.title}」の編集を保存 (Cmd/Ctrl+Enter でも可)',
    '保存中… — 提案「${proposal.title}」の編集を保存中',
  ]
  for (const e of expected) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `decompose-proposals-panel に visible-prefix '${e}' が無い`,
      })
    }
  }
  // 旧 bare aria-label が残ってないか
  const oldBares = [
    '`「${proposal.title}」の編集をキャンセル`',
    '`提案「${proposal.title}」の編集を保存中…`',
    '`提案「${proposal.title}」の編集を保存 (Cmd/Ctrl+Enter でも可)`',
  ]
  for (const s of oldBares) {
    if (src.includes(s)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `旧 bare aria-label '${s}' が残存`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — decompose-proposals-panel edit aria-label は visible-prefix 配置済')
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
