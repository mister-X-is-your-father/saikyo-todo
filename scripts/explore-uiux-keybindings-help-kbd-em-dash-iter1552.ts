/**
 * Phase 6.15 loop iter1552: keybindings-help-modal KbdRow dt aria-label を em-dash 形式に
 * migration (iter1093-1551 sweep convention 着地、WCAG 2.5.3 fix)。
 *
 * 旧 aria-label `"ショートカット ${kb.combo}"` は visible "${kb.combo}" (e.g., "g t") を
 * 中位置 "ショートカット **g t**" に持ち、voice control prefix-matching「click g t」 が
 * strict prefix-match で不可 (substring 一致のみ)。iter1093-1551 sweep convention で
 * visible 冒頭固定 + em-dash 区切。
 *
 * 修正 (keybindings-help-modal.tsx):
 *   `ショートカット ${kb.combo}` → `${kb.combo} — ショートカット`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-keybindings-help-kbd-em-dash-iter1552.ts
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
  const src = readFileSync(
    resolve(here, '../src/components/shared/keybindings-help-modal.tsx'),
    'utf8',
  )

  if (!src.includes('aria-label={`${kb.combo} — ショートカット`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'keybindings-help-modal KbdRow dt aria-label が em-dash 形式でない',
    })
  }
  if (src.includes('aria-label={`ショートカット ${kb.combo}`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'keybindings-help-modal KbdRow dt 旧 aria-label (visible 中位置) が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — keybindings-help-modal KbdRow dt aria-label が em-dash 形式')
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
