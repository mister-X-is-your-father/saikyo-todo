/**
 * Phase 6.15 loop iter1213: subtasks-panel outdent + indent icon-only button
 * aria-label visible-prefix regression guard。
 *
 * iter1213 で発見した visible-prefix 漏れ (subtasks-bulk iter1211 と同 sweep):
 * subtasks-panel.tsx の icon-only button 2 種:
 *
 * 1. `subtask-outdent-${item.id}` 旧 aria-label (全 3 path) `「${item.title}」を ...
 *    アウトデント (...)` は visible text 無 (icon-only) で title attribute "アウトデント
 *    (Alt+←)" が tooltip 専用、voice control prefix-matching「click アウトデント」 match
 *    不可 (aria-label 中位置に "アウトデント" を持つ)。
 *
 * 2. `subtask-indent-${item.id}` 旧 aria-label (全 4 path) 同 pattern。
 *
 * 修正 (subtasks-panel.tsx):
 * - outdent: 全 3 path とも `アウトデント — ...` で先頭固定
 * - indent: 全 4 path とも `インデント — ...` で先頭固定
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-subtasks-indent-outdent-visible-prefix-iter1213.ts
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
  const filePath = resolve(here, '../src/components/workspace/subtasks-panel.tsx')
  const src = readFileSync(filePath, 'utf8')

  const expectedOutdent = [
    '`アウトデント — 「${item.title}」は root のためアウトデント不可`',
    '`アウトデント — 「${item.title}」を移動中…`',
    '`アウトデント — 「${item.title}」を 1 段アウトデント (Alt+←)`',
  ]
  for (const e of expectedOutdent) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `subtask-outdent aria-label 新 path 欠落: ${e}`,
      })
    }
  }

  const expectedIndent = [
    '`インデント — 深さ ${MAX_TREE_DEPTH} を超えるためインデント不可`',
    '`インデント — 「${item.title}」の前に sibling が無いためインデント不可`',
    '`インデント — 「${item.title}」を移動中…`',
    '`インデント — 「${item.title}」を 1 段インデント (Alt+→)`',
  ]
  for (const e of expectedIndent) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `subtask-indent aria-label 新 path 欠落: ${e}`,
      })
    }
  }

  // 旧 prefix-less 形式が active code に残存していないこと (comment 除外)
  const activeCode = src
    .split('\n')
    .filter((l) => !/^\s*\/\//.test(l) && !/^\s*\*/.test(l))
    .join('\n')
  const oldForbidden = [
    '`「${item.title}」は root のためアウトデント不可`',
    '`「${item.title}」を 1 段アウトデント (Alt+←)`',
    '`深さ ${MAX_TREE_DEPTH} を超えるためインデント不可`',
    '`「${item.title}」の前に sibling が無いためインデント不可`',
    '`「${item.title}」を 1 段インデント (Alt+→)`',
  ]
  for (const o of oldForbidden) {
    if (activeCode.includes(o)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `旧 prefix-less aria-label が active code に残存: ${o}`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — subtask-outdent + subtask-indent aria-label は visible 冒頭固定済 (合計 7 path)',
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
