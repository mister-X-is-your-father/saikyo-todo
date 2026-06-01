/**
 * Phase 6.15 loop iter1653: sr-only count span 2 件を em-dash 区切に統一。
 * iter1619 (keybindings-help group count) / iter1633 (dashboard MUST list) /
 * iter1640 (list aria-label sweep) と同 pattern の補完。
 *
 *   - time-entries-panel.tsx  `\`一覧 ${N} 件\`` → `\`一覧 — ${N} 件\``
 *   - kanban-view.tsx         `\` ${N} 件\`` → `\` — ${N} 件\`` (visible label の leading space)
 *
 * これで sr-only family (caption / heading count span / 区切) が em-dash convention で
 * 完全統一。CardTitle / h3 内 visible は paren ` (X 件)` のまま (mirror style)。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-sr-only-count-em-dash-iter1653.ts
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

  const sip = readFileSync(
    resolve(here, '../src/components/time-entry/time-entries-panel.tsx'),
    'utf8',
  )
  if (!sip.includes('`一覧 — ${q.data.length} 件`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'time-entries-panel sr-only `一覧 — ${N} 件` em-dash 未着地',
    })
  }

  const kv = readFileSync(resolve(here, '../src/components/workspace/kanban-view.tsx'), 'utf8')
  if (!kv.includes('{` — ${items.length} 件`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'kanban-view sr-only leading em-dash 未着地',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — 2 sr-only count span が em-dash convention で統一')
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
