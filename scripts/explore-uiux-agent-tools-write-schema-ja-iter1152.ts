/**
 * Phase 6.15 loop iter1152: agent/tools/write.ts の Agent tool 入力 schema 4 件 に
 * ja message 付与 regression guard。
 *
 * iter1152 で発見した bug: AgentCreateItem / AgentWriteComment / AgentCreateDoc /
 * AgentProposeChildItem 各 schema の string min/max に ja message 無く zod default
 * 英語が露出。Agent からの tool 呼び出し時 validation error は agent_invocations.error_message
 * に記録され UI に出るため日本語化が必要。
 *
 * iter1086/1092/1126-1151 sweep 継続。real Supabase 不要、source 直読 invariant。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-agent-tools-write-schema-ja-iter1152.ts
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
  const filePath = resolve(here, '../src/features/agent/tools/write.ts')
  const src = readFileSync(filePath, 'utf8')

  // 共通 message (= 4 schema 間で文字数違いの「タイトル」 「説明」 「DoD」 「本文」 等)
  const expected = [
    "'タイトルを入力してください'",
    "'タイトルは 500 文字以内で入力してください'",
    "'説明は 5,000 文字以内で入力してください'",
    "'ステータスを指定してください'",
    "'DoD は 2,000 文字以内で入力してください'",
    "'コメント本文を入力してください'",
    "'コメント本文は 5,000 文字以内で入力してください'",
    "'本文を入力してください'",
    "'本文は 20,000 文字以内で入力してください'",
  ]
  for (const e of expected) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `agent/tools/write.ts に ja message ${e} が無い`,
      })
    }
  }

  // タイトル + 説明 + DoD は AgentCreateItem + AgentProposeChildItem の 2 schema に重複出現
  const sharedTitleMessages = [
    "'タイトルを入力してください'",
    "'タイトルは 500 文字以内で入力してください'",
    "'説明は 5,000 文字以内で入力してください'",
    "'DoD は 2,000 文字以内で入力してください'",
  ]
  for (const m of sharedTitleMessages) {
    const cnt = src.split(m).length - 1
    // CreateItem (1) + CreateDoc (1, タイトル/DoD 等) + ProposeChildItem (1)
    if (cnt < 2) {
      findings.push({
        level: 'warning',
        source: 'a11y',
        message: `共通 ja message ${m} が ${cnt} 件 (CreateItem + ProposeChildItem 含む 2 以上期待)`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — agent/tools/write.ts 全 string max/min に ja message 統一済')
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
