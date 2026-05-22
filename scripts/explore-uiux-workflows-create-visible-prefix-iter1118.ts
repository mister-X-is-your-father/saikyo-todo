/**
 * Phase 6.15 loop iter1118: workflows-panel wf-create-btn aria-label visible-prefix regression guard。
 *
 * iter1118 で発見した bug: wf-create-btn default + pending 旧 aria-label は visible "作成" /
 * "作成中…" を末尾持ち。empty-title は維持。
 *
 * 修正 (workflows-panel.tsx):
 *   - default: "作成 — Workflow を新規作成 (Cmd/Ctrl+Enter でも可)"
 *   - pending: "作成中… — Workflow を作成中"
 *
 * 実 supabase + workflow context 必要、Docker 不在で fallback。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-workflows-create-visible-prefix-iter1118.ts
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
  const filePath = resolve(here, '../src/components/workflow/workflows-panel.tsx')
  const src = readFileSync(filePath, 'utf8')

  const expected = [
    "'作成 — Workflow を新規作成 (Cmd/Ctrl+Enter でも可)'",
    "'作成中… — Workflow を作成中'",
  ]
  for (const e of expected) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `workflows-panel wf-create に visible-prefix '${e}' が無い`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — workflows-panel wf-create-btn aria-label は visible-prefix 配置済')
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
