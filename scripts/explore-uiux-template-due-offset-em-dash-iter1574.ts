/**
 * Phase 6.15 loop iter1574: template-items-editor 期日 offset chip aria-label を
 * visible 冒頭 em-dash 形式に migration (iter1093-1573 sweep convention 着地)。
 *
 * 旧 aria-label `"期日 offset +${days} 日"` は visible "+${days}日" を末尾に持ち voice control
 * prefix-matching「click +N日」 が strict prefix-match で不可。iter1093-1573 sweep convention
 * で visible 冒頭固定 + em-dash 区切。
 *
 * 修正 (template-items-editor.tsx):
 *   "期日 offset +${it.dueOffsetDays} 日" → "+${it.dueOffsetDays} 日 — 期日 offset"
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-template-due-offset-em-dash-iter1574.ts
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
    resolve(here, '../src/components/template/template-items-editor.tsx'),
    'utf8',
  )

  if (!src.includes('aria-label={`+${it.dueOffsetDays} 日 — 期日 offset`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'template-items 期日 offset aria-label が em-dash 形式でない',
    })
  }
  if (src.includes('aria-label={`期日 offset +${it.dueOffsetDays} 日`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 visible 末尾形式 aria-label が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — template-items 期日 offset chip aria-label が em-dash 形式')
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
