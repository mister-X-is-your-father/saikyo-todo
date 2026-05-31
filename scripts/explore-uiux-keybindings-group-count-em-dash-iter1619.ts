/**
 * Phase 6.15 loop iter1619: keybindings-help-modal group heading sr-only count span paren を em-dash
 * 区切に migration (iter1615-1618 sr-only sweep family と同 pattern、iter1093-1618 sweep convention
 * 着地)。
 *
 * 旧 sr-only paren convention ` (X 件)` は iter1093-1618 sweep の em-dash 区切と divergent。
 * 区切のみ '(' → ' — ' に統一、closing ')' は削除。
 *
 * 修正 (keybindings-help-modal.tsx):
 *   ` (${list.length} 件)` → ` — ${list.length} 件`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-keybindings-group-count-em-dash-iter1619.ts
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

  if (!src.includes('<span className="sr-only"> — {list.length} 件</span>')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'keybindings-help group sr-only count span が em-dash 区切でない',
    })
  }
  if (src.includes('<span className="sr-only"> ({list.length} 件)</span>')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'keybindings-help group sr-only count span 旧 paren 区切が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — keybindings-help group sr-only count span が em-dash 区切')
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
