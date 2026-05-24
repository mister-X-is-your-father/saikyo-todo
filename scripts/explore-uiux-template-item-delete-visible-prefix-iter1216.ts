/**
 * Phase 6.15 loop iter1216: template-items-editor delete icon-only Trash2 button aria-label
 * visible-prefix regression guard。
 *
 * iter1216 で発見した visible-prefix 漏れ (src-delete / wf-delete iter1215 と同 sweep):
 * template-items-editor.tsx の icon-only Trash2 button:
 *
 * 旧 aria-label 2 path `Template item「${title}」を削除[中…]` は visible 概念名 "削除"
 * を末尾 "Template item「title」を **削除**" に持ち voice control prefix-matching
 * 「click 削除」 match 不可 (icon-only Trash2、visible text 無、title attribute も無し)。
 *
 * 修正 (template-items-editor.tsx):
 * 2 path とも `削除[中…] — Template item「title」を削除[中]` で先頭固定
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-template-item-delete-visible-prefix-iter1216.ts
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

  const expected = [
    '`削除中… — Template item「${it.title}」を削除中`',
    '`削除 — Template item「${it.title}」を削除`',
  ]
  for (const e of expected) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `template-item delete aria-label 新 path 欠落: ${e}`,
      })
    }
  }

  const activeCode = src
    .split('\n')
    .filter((l) => !/^\s*\/\//.test(l) && !/^\s*\*/.test(l))
    .join('\n')
  if (activeCode.includes('`Template item「${it.title}」を削除中…`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 prefix-less template-item delete pending path が active code に残存',
    })
  }
  if (activeCode.includes('? `Template item「${it.title}」を削除`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 prefix-less template-item delete default path が active code に残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — template-item delete aria-label は visible 冒頭固定済 (全 2 path)')
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
