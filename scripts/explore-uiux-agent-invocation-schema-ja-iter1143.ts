/**
 * Phase 6.15 loop iter1143: agent/schema.ts InvocationPrompt + EnqueueInvocation
 * の max/min に ja message 付与 regression guard。
 *
 * iter1143 で発見した bug: content.min(1) / maxTokens.max(16_384) / model.min(1) には
 * ja message 無く zod default 英語が露出 (messages.min は既に ja 済)。Agent API は
 * REST / MCP 経由で外部にも公開されるため error message の日本語化が必要。
 *
 * 実 supabase + agent invocation 必要、Docker 不在で fallback (source 直読)。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-agent-invocation-schema-ja-iter1143.ts
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
  const filePath = resolve(here, '../src/features/agent/schema.ts')
  const src = readFileSync(filePath, 'utf8')

  const expected = [
    "'メッセージ本文を入力してください'",
    "'最大トークン数は 16,384 以下で指定してください'",
    "'Anthropic モデル ID を入力してください'",
  ]
  for (const e of expected) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `agent schema に ja message ${e} が無い`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — agent schema 全 max/min に ja message 統一済')
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
