/**
 * Phase 6.15 loop iter1099: item-edit-dialog cancel / save button aria-label visible-prefix regression
 * guard。
 *
 * iter1099 で発見した bug: item-edit-cancel + item-edit-save の旧 aria-label
 *   - 「title」の編集をキャンセル
 *   - 「title」を保存 (Cmd/Ctrl+S でも可、楽観ロックで version が進む)
 *   - 「title」を保存中…
 * は visible "キャンセル" / "保存" / "保存中…" を末尾持ち、voice control prefix-matching で
 * 「click 保存」 match 不可。iter1093-1098 sweep convention に合わせ visible 冒頭固定。
 *
 * empty-title path は visible "保存" が既に "保存するにはタイトルを入力してください" の prefix
 * なので維持。
 *
 * 修正 (item-edit-dialog.tsx): aria-label を visible-prefix 形式に統一:
 *   - cancel: "キャンセル — 「name」の編集を破棄"
 *   - save default: "保存 — 「name」を保存 (Cmd/Ctrl+S でも可、楽観ロックで version が進む)"
 *   - save pending: "保存中… — 「name」を保存中"
 *
 * item-edit-dialog は実 supabase + auth + item fixture 必要、Docker 不在で browser 不能のため
 * source-of-truth 直読 invariant fallback。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-item-edit-cancel-save-visible-prefix-iter1099.ts
 * 前提: なし (filesystem 読み込みのみ)
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

  // visible-prefix 形式が存在するか
  const expectedPrefixes = [
    'キャンセル — 「${item.title}」の編集を破棄',
    '保存 — 「${item.title}」を保存 (Cmd/Ctrl+S でも可、楽観ロックで version が進む)',
    '保存中… — 「${item.title}」を保存中',
  ]
  for (const p of expectedPrefixes) {
    if (!src.includes(p)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `item-edit-dialog に visible-prefix 形式 '${p}' が無い`,
      })
    }
  }
  // 旧 visible-suffix 形式 (= prefix を付けずに直接 「title」 で始まる aria-label) が残ってないか
  // 新しい形式は「visible-prefix — 「title」...」なので、bare `「${item.title}」を保存 / キャンセル
  // で始まる aria-label が残っていれば old pattern。
  const oldBares = ['`「${item.title}」の編集をキャンセル`', '`「${item.title}」を保存中…`']
  for (const s of oldBares) {
    if (src.includes(s)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `旧 bare-suffix '${s}' が aria-label として残存`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — item-edit-dialog cancel/save aria-label は visible-prefix 配置済')
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
