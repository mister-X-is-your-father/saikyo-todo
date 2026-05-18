/**
 * Phase 6.15 loop iter 972 (mode-M Mobile) — integrations-panel External Source 作成
 * form の 8 IMEInput に enterKeyHint を追加 (next x 6, send x 2)。
 * iter949-971 enterKeyHint sweep 17 form 目、最大 form (8 input) を一括 covered。
 *
 * 課題: integrations-panel External Source form は kind 別 (yamory / custom-api) に
 *   多数の input を持つ:
 *   - src-name (必須、両 variant 共通)
 *   - yamory variant: src-token, src-project-ids
 *   - custom variant: src-url, src-items-path, src-due-path, src-id-path, src-title-path
 *   全 8 IMEInput が enterKeyHint 未指定で Mobile keyboard で「次の field か submit か」
 *   user 判別不能だった。
 *
 * fix: integrations-panel.tsx で
 *   - src-name → next (名前 → token/url へ)
 *   - src-token → next (token → project-ids へ)
 *   - src-project-ids → send (project-ids → yamory variant submit)
 *   - src-url → next (URL → items-path へ)
 *   - src-items-path → next (items-path → due-path へ)
 *   - src-due-path → next (due-path → id-path へ)
 *   - src-id-path → next (id-path → title-path へ)
 *   - src-title-path → send (title-path → custom variant submit)
 *   +8/-0 行 (1 file)。視覚 / 動作不変。Mobile keyboard "次へ" / "送信" 翻訳で 8 field
 *   form の入力 flow 明示。
 *
 * 機能追加なし、shadcn 編集なし、影響面 1 ファイル。
 *
 * 検証: source-side regex で codify。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const target = 'src/components/integrations/integrations-panel.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  function checkInputContext(id: string, suffix: string): void {
    const idx = src.indexOf(`id="${id}"`)
    if (idx < 0) {
      findings.push({ level: 'error', message: `${target}: id="${id}" 不在` })
      return
    }
    const ctx = src.slice(Math.max(0, idx - 50), idx + 800)
    if (!new RegExp(`enterKeyHint="${suffix}"`).test(ctx)) {
      findings.push({
        level: 'warning',
        message: `${target}: ${id} に enterKeyHint="${suffix}" 不在`,
      })
    } else {
      findings.push({ level: 'info', message: `${id} enterKeyHint="${suffix}" OK` })
    }
  }

  checkInputContext('src-name', 'next')
  checkInputContext('src-token', 'next')
  checkInputContext('src-project-ids', 'send')
  checkInputContext('src-url', 'next')
  checkInputContext('src-items-path', 'next')
  checkInputContext('src-due-path', 'next')
  checkInputContext('src-id-path', 'next')
  checkInputContext('src-title-path', 'send')

  // iter971 invariant: workflows-panel enterKeyHint
  const workflowsSrc = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  if (!/enterKeyHint="next"/.test(workflowsSrc)) {
    findings.push({ level: 'warning', message: `iter971 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter971 invariant OK` })
  }

  // iter735 invariant
  const tce = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  const tceMatches = tce.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tceMatches.length >= 2) {
    findings.push({ level: 'info', message: `iter735 invariant OK (${tceMatches.length} 箇所)` })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant 破壊` })
  }

  console.log(`\n=== Findings (integrations-panel-enter-key-hint-iter972) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
