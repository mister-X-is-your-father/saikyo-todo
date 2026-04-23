/**
 * Day 0.3 PoC: Anthropic SDK (@anthropic-ai/sdk) で Messages API + tool use
 * 実行: `pnpm tsx scripts/poc-anthropic.ts`
 *
 * ANTHROPIC_API_KEY が必要。.env.local に書くか、環境変数で渡す。
 * 設定されていなければスキップして構造のみ確認する。
 */
import 'dotenv/config'

import Anthropic from '@anthropic-ai/sdk'

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.log('[skip] ANTHROPIC_API_KEY 未設定。SDK のロードと型確認のみ実施。')
    const dummy = new Anthropic({ apiKey: 'sk-dummy' })
    console.log(
      `[ok] @anthropic-ai/sdk のロード OK (apiKey="${dummy.apiKey?.slice(0, 4) ?? 'n/a'}***")`,
    )
    console.log('     実 API テストは API key を .env.local にセットして再実行')
    return
  }

  const client = new Anthropic({ apiKey })

  console.log('[1] Messages API basic call')
  const basic = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 100,
    messages: [{ role: 'user', content: '一行で自己紹介してください。' }],
  })
  const text = basic.content.find((b) => b.type === 'text')
  console.log(`  output: ${text && 'text' in text ? text.text : '(no text)'}`)
  console.log(`  tokens: in=${basic.usage.input_tokens} out=${basic.usage.output_tokens}`)

  console.log('\n[2] Tool use (single round)')
  const toolCall = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 500,
    tools: [
      {
        name: 'create_item',
        description: 'Create a TODO item in the workspace',
        input_schema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Item title' },
            is_must: { type: 'boolean', description: 'MUST flag' },
          },
          required: ['title'],
        },
      },
    ],
    messages: [
      {
        role: 'user',
        content: '「明日までに API 設計レビューを完了する」というタスクを作成して。',
      },
    ],
  })
  const toolUse = toolCall.content.find((b) => b.type === 'tool_use')
  if (toolUse && toolUse.type === 'tool_use') {
    console.log(`  tool: ${toolUse.name}`)
    console.log(`  input: ${JSON.stringify(toolUse.input)}`)
  } else {
    console.log('  (Agent did not call any tool)')
  }
  console.log(
    `  tokens: in=${toolCall.usage.input_tokens} out=${toolCall.usage.output_tokens} stop=${toolCall.stop_reason}`,
  )

  console.log('\n[3] Prompt cache (cache_creation_input_tokens を観測)')
  const longContext = `これは最強TODO の Workspace コンテキストです。${'\n- Item: '.repeat(50)}`
  const cached = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 50,
    system: [
      {
        type: 'text',
        text: longContext,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: '今のコンテキストを 5 文字で要約。' }],
  })
  const cu = cached.usage as {
    cache_creation_input_tokens?: number
    cache_read_input_tokens?: number
  } & typeof cached.usage
  console.log(
    `  cache_creation=${cu.cache_creation_input_tokens ?? 0} cache_read=${cu.cache_read_input_tokens ?? 0}`,
  )

  console.log('\nAll checks passed.')
}

main().catch((e) => {
  console.error('PoC failed:', e)
  process.exit(1)
})
