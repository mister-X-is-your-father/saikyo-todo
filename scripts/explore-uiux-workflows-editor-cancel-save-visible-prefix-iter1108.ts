/**
 * Phase 6.15 loop iter1108: workflows-panel editor cancel/save aria-label visible-prefix
 * regression guard。
 *
 * iter1108 で発見した bug: wf-editor-cancel + wf-editor-save 3 path の旧 aria-label は visible
 * "キャンセル" / "保存" / "保存中…" を末尾持ちで voice control prefix-matching match 不可。
 *
 * 修正 (workflows-panel.tsx):
 *   - cancel: "キャンセル — Workflow「name」の編集を破棄"
 *   - save default: "保存 — Workflow「name」の graph / trigger を保存"
 *   - save pending: "保存中… — Workflow「name」の編集を保存中"
 *
 * 実 supabase + workflow fixture 必要、Docker 不在で fallback。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-workflows-editor-cancel-save-visible-prefix-iter1108.ts
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
    'キャンセル — Workflow「${wf.name}」の編集を破棄',
    '保存 — Workflow「${wf.name}」の graph / trigger を保存',
    '保存中… — Workflow「${wf.name}」の編集を保存中',
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
  const oldBares = [
    '`Workflow「${wf.name}」の編集をキャンセル`',
    '`Workflow「${wf.name}」の編集を保存中…`',
    '`Workflow「${wf.name}」の graph / trigger を保存`',
  ]
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
    console.log('(なし) — workflows-panel editor aria-label は visible-prefix 配置済')
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
