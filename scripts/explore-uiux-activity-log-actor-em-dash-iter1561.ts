/**
 * Phase 6.15 loop iter1561: activity-log actor type chip aria-label を visible 冒頭
 * em-dash 形式に migration + visible language alignment (user → ユーザ)。
 *
 * 旧 aria-label `'実行者: AI Agent'` / `'実行者: ユーザ'` は ':' colon 区切で visible
 * ("AI" / "user") を先頭に持たず voice control prefix-matching 不可。
 *
 * 加えて user path は visible "user" (English) と aria "ユーザ" (Japanese) の language
 * divergence で「click user」「click ユーザ」どちらでも不可 (WCAG 2.5.3)。
 *
 * 修正 (activity-log.tsx):
 *   - aria-label agent: `実行者: AI Agent` → `AI Agent — 実行者`
 *   - aria-label user:  `実行者: ユーザ` → `ユーザ — 実行者`
 *   - visible user: `user` → `ユーザ` (Japanese 化、aria と align)
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-activity-log-actor-em-dash-iter1561.ts
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
  const src = readFileSync(resolve(here, '../src/components/workspace/activity-log.tsx'), 'utf8')

  if (!src.includes("'AI Agent — 実行者'") || !src.includes("'ユーザ — 実行者'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'activity-log actor aria-label が em-dash 形式でない',
    })
  }
  if (src.includes("'実行者: AI Agent'") || src.includes("'実行者: ユーザ'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 colon 形式 aria-label が残存',
    })
  }
  // visible user → ユーザ alignment
  if (src.includes("? 'AI' : 'user'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'visible "user" 残存 (Japanese ユーザ に align してない)',
    })
  }
  if (!src.includes("? 'AI' : 'ユーザ'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'visible ユーザ が無い',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — activity-log actor chip が em-dash + visible align')
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
