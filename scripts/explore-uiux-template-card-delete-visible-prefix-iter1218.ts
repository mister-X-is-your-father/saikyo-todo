/**
 * Phase 6.15 loop iter1218: templates-panel template-card delete icon-only Trash2 button
 * aria-label visible-prefix regression guard。
 *
 * iter1218 で発見した visible-prefix 漏れ (template-item delete iter1216 と同 sweep):
 * templates-panel.tsx の icon-only Trash2 button (Template card header 右上):
 *
 * 旧 aria-label 2 path `Template「${name}」を削除[中…]` は visible 概念名 "削除" を末尾
 * "Template「name」を **削除**" に持ち voice control prefix-matching「click 削除」 match
 * 不可 (icon-only Trash2、visible text 無、title attribute も無し)。
 *
 * 修正 (templates-panel.tsx):
 * 2 path とも `削除[中…] — Template「name」を削除[中]` で先頭固定
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-template-card-delete-visible-prefix-iter1218.ts
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
  const filePath = resolve(here, '../src/components/template/templates-panel.tsx')
  const src = readFileSync(filePath, 'utf8')

  const expected = [
    '`削除中… — Template「${t.name}」を削除中`',
    '`削除 — Template「${t.name}」を削除`',
  ]
  for (const e of expected) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `template-card delete aria-label 新 path 欠落: ${e}`,
      })
    }
  }

  const activeCode = src
    .split('\n')
    .filter((l) => !/^\s*\/\//.test(l) && !/^\s*\*/.test(l))
    .join('\n')
  if (activeCode.includes('`Template「${t.name}」を削除中…`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 prefix-less template-card delete pending path が active code に残存',
    })
  }
  if (activeCode.includes('? `Template「${t.name}」を削除`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 prefix-less template-card delete default path が active code に残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — template-card delete aria-label は visible 冒頭固定済 (全 2 path)')
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
