/**
 * Phase 6.15 loop iter2361: src-kind select に title 付与し aria-label
 * kind-dependent と sync。edit-item-sprint iter2287 / sprint-defaults-dow
 * iter1194 と同 select title-aria sync pattern を integrations src-kind にも
 * 展開、source 種別選択 UX 補完。
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

  const ip = readFileSync(
    resolve(here, '../src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (!ip.includes('iter2361')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'integrations-panel iter2361 marker が無い',
    })
  }
  // aria + title IIFE 計 2 出現
  const expr = (ip.match(/`\$\{visible\} — Source 種別 \(現在: \$\{visible\}\)`/g) || []).length
  if (expr < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `src-kind select expression 出現 ${expr} 回、aria-label + title IIFE 計 2 回必要`,
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — src-kind select title sync 完了、integrations source 種別選択 UX 補完')
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
