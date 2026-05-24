/**
 * Phase 6.15 loop iter1219: item-checkbox icon-only checkbox button aria-label
 * visible-prefix regression guard。
 *
 * iter1219 で発見した visible-prefix 漏れ (proposal-reject iter1217 と同 sweep):
 * item-checkbox.tsx の icon-only checkbox button の旧 aria-label 3 path
 * `「${item.title}」を ... 完了にする / 未完了に戻す / 切替中…` は visible 概念名を末尾
 * ("「title」を **完了にする**" / "「title」の完了状態を **切替中…**") に持ち voice
 * control prefix-matching「click 完了にする / 未完了に戻す / 切替中…」 match 不可
 * (icon-only checkbox、visible text 無、title attribute は tooltip 専用)。
 *
 * 修正 (item-checkbox.tsx):
 * - pending: `切替中… — 「title」の完了状態を切替中`
 * - done: `未完了に戻す — 「title」を未完了に戻す`
 * - undone: `完了にする — 「title」を完了にする`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-item-checkbox-visible-prefix-iter1219.ts
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
  const filePath = resolve(here, '../src/components/workspace/item-checkbox.tsx')
  const src = readFileSync(filePath, 'utf8')

  const expected = [
    '`切替中… — 「${item.title}」の完了状態を切替中`',
    '`未完了に戻す — 「${item.title}」を未完了に戻す`',
    '`完了にする — 「${item.title}」を完了にする`',
  ]
  for (const e of expected) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `item-checkbox aria-label 新 path 欠落: ${e}`,
      })
    }
  }

  const activeCode = src
    .split('\n')
    .filter((l) => !/^\s*\/\//.test(l) && !/^\s*\*/.test(l))
    .join('\n')
  if (activeCode.includes('`「${item.title}」の完了状態を切替中…`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 prefix-less item-checkbox pending path が active code に残存',
    })
  }
  if (activeCode.includes("`「${item.title}」を${isDone ? '未完了に戻す' : '完了にする'}`")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 prefix-less item-checkbox toggle path が active code に残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — item-checkbox aria-label は visible 冒頭固定済 (全 3 path)')
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
