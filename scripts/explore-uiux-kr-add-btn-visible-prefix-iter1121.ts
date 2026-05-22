/**
 * Phase 6.15 loop iter1121: kr-add-btn aria-label visible-prefix regression guard — WCAG 2.5.3 substring 修正。
 *
 * iter1121 で発見した bug: kr-add-btn の旧 aria-label "Key Result をこの Goal に追加" /
 * "Key Result を追加中…" は visible "KR 追加" (KR = Key Result 略語) を literal substring に含まず、
 * "KR" 略語が "Key Result" full に展開された divergence = WCAG 2.5.3 違反 + voice control
 * 「click KR 追加」 matching 失敗。empty-title path も同様だが visible "KR 追加" prefix で維持。
 *
 * 修正 (goals-panel.tsx) — 2 path visible-prefix:
 *   - default: "KR 追加 — Key Result をこの Goal に追加"
 *   - pending: "KR 追加 — Key Result を追加中…"
 *
 * 実 supabase + goal fixture 必要、Docker 不在で fallback。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-kr-add-btn-visible-prefix-iter1121.ts
 * 前提: なし
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
  const filePath = resolve(here, '../src/components/workspace/goals-panel.tsx')
  const src = readFileSync(filePath, 'utf8')

  const expected = ["'KR 追加 — Key Result をこの Goal に追加'", "'KR 追加 — Key Result を追加中…'"]
  for (const e of expected) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `kr-add-btn aria-label に visible-prefix '${e}' が無い`,
      })
    }
  }
  // 旧 bare aria-label が残ってないか
  const oldBares = ["'Key Result を追加中…'", "'Key Result をこの Goal に追加'"]
  for (const s of oldBares) {
    if (src.includes(s)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `旧 bare aria-label '${s}' が残存`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — kr-add-btn aria-label は visible-prefix 配置済 (WCAG 2.5.3 satisfy)')
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
