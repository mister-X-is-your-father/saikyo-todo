/**
 * Phase 6.15 loop iter1116: workflows-panel WorkflowCard 4 action button (trigger / edit / toggle /
 * runs-toggle) aria-label visible-prefix regression guard。
 *
 * iter1116 で発見した bug: 4 button × 多 path の旧 aria-label は visible "実行"/"実行中…"/"編集"/
 * "無効化"/"有効化"/"履歴" を末尾持ちで voice control prefix-matching match 不可。wf-delete は
 * icon-only (Trash2 aria-hidden) で WCAG 違反無し維持。iter1093-1115 sweep convention に合わせ
 * visible 冒頭固定。
 *
 * 実 supabase + workflow fixture 必要、Docker 不在で fallback。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-workflows-card-actions-visible-prefix-iter1116.ts
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
    '実行 — Workflow「${wf.name}」を手動で sync 実行 (各 node 10-60s timeout)',
    '実行中… — Workflow「${wf.name}」を実行中',
    '編集 — Workflow「${wf.name}」の graph / trigger を編集',
    '有効化 — Workflow「${wf.name}」を有効化',
    '無効化 — Workflow「${wf.name}」を無効化',
    '履歴 — Workflow「${wf.name}」の実行履歴 (直近 5 件) を表示',
    '履歴 — Workflow「${wf.name}」の実行履歴 (直近 5 件) を閉じる',
  ]
  for (const e of expected) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `workflows-panel に visible-prefix '${e}' が無い`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — workflows-panel 4 action button aria-label は visible-prefix 配置済')
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
