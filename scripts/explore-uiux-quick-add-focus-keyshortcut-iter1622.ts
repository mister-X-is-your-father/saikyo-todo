/**
 * Phase 6.15 loop iter1622: quick-add input の aria-keyshortcuts に focus
 * shortcut `q` を追加 ('q Enter')。GlobalShortcuts (`q` → quick-add-input.focus())
 * を SR / voice control の API 経由でも公示。WAI-ARIA spec: 「aria-keyshortcuts
 * は要素に作用する shortcut (focus も含む) を宣言」。
 *
 * 効果:
 *   1. SR で input element の properties 一覧時に `q Enter` 両方が表示
 *      = 「q でここに来られる」 が assistive tech 経由で発見可能
 *   2. voice control が aria-keyshortcuts 経由で「press q」 / 「press Enter」
 *      コマンド推論を改善
 *   3. KEYBINDINGS table (src/lib/keybindings.ts) + UI 内 hint と整合
 *
 * 修正 file:
 *   src/components/workspace/quick-add.tsx  (aria-keyshortcuts に `q ` を prefix)
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-quick-add-focus-keyshortcut-iter1622.ts
 * 前提: なし (source 直読 invariant only、supabase / docker 起動不可 fire 対応)
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
  const src = readFileSync(resolve(here, '../src/components/workspace/quick-add.tsx'), 'utf8')

  // (1) IMEInput に aria-keyshortcuts="q Enter" が付いていること
  if (!src.includes('aria-keyshortcuts="q Enter"')) {
    findings.push({
      level: 'error',
      source: 'aria',
      message: `quick-add.tsx の IMEInput に aria-keyshortcuts="q Enter" が無い (focus shortcut 'q' が宣言されていない)`,
    })
  }

  // (2) 旧 'Enter' 単独宣言が残っていないこと (= IMEInput 上で)
  // 注: Button 側は焦点中の Enter submit のため `aria-keyshortcuts="Enter"` 維持で正
  const imeInputBlockMatch = src.match(/<IMEInput[\s\S]*?\/>/)
  if (imeInputBlockMatch) {
    const imeBlock = imeInputBlockMatch[0]
    if (imeBlock.includes('aria-keyshortcuts="Enter"')) {
      findings.push({
        level: 'error',
        source: 'aria',
        message: `IMEInput に旧 aria-keyshortcuts="Enter" 単独宣言が残存 (focus shortcut 'q' を含む 'q Enter' に更新されていない)`,
      })
    }
  } else {
    findings.push({
      level: 'error',
      source: 'parse',
      message: 'quick-add.tsx に IMEInput block が見つからない',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — quick-add input に focus shortcut `q` 含む aria-keyshortcuts 適用済 (iter1622 着地)',
    )
  } else {
    for (const f of findings) console.log(`  [${f.level}/${f.source}] ${f.message}`)
  }
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.filter((f) => f.level === 'error').length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
