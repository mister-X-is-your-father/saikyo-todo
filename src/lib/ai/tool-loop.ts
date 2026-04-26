/**
 * Anthropic Messages API の tool_use ループ。
 * Agent が tool を呼ぶ → ハンドラを実行 → tool_result を付けて再度モデルに送る、を
 * stop_reason !== 'tool_use' になるまで繰り返す。
 *
 * 使い方:
 *   const result = await executeToolLoop({
 *     model: 'claude-haiku-4-5',
 *     initialMessages: [{ role: 'user', content: '...' }],
 *     tools: [{ name: 'create_item', description: '...', input_schema: {...} }],
 *     handlers: { create_item: async (input) => 'ok' },
 *   })
 *
 * 注意:
 *   - `invoker` は DI できる (テストで mock 可能)。省略時は `invokeModel` を使う
 *   - `maxIterations` (既定 10) を超えると Error を throw (無限ループ防止)
 *   - usage は iteration を跨いで累積される
 */
import 'server-only'

import type { MessageParam, Tool } from '@anthropic-ai/sdk/resources/messages'

import { CancelledError } from '@/lib/errors'

import { invokeModel, type InvokeModelOutput } from './invoke'
import type { TokenUsage } from './pricing'

export type ToolHandler = (input: unknown) => Promise<string>

export interface ToolLoopInput {
  model: string
  system?: string
  initialMessages: MessageParam[]
  tools: Tool[]
  handlers: Record<string, ToolHandler>
  maxIterations?: number
  maxTokens?: number
  /** DI: invokeModel を差し替え可能。テスト用。 */
  invoker?: (args: {
    model: string
    system?: string
    messages: MessageParam[]
    tools?: Tool[]
    maxTokens?: number
  }) => Promise<InvokeModelOutput>
  /**
   * 各 iteration の前 + tool 呼び出しの前に呼ばれる中止判定。
   * true を返すと `CancelledError` が throw されてループを抜ける。
   * 用途: Server Action 経由でユーザーが invocation を cancel した時の検知。
   */
  shouldAbort?: () => Promise<boolean>
}

export interface ToolCallRecord {
  name: string
  input: unknown
  result: string
}

export interface ToolLoopOutput {
  text: string
  iterations: number
  toolCalls: ToolCallRecord[]
  usage: TokenUsage
  finalMessages: MessageParam[]
  stopReason: InvokeModelOutput['stopReason']
}

const DEFAULT_MAX_ITERATIONS = 10

function addUsage(a: TokenUsage, b: TokenUsage): TokenUsage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cacheCreationTokens: (a.cacheCreationTokens ?? 0) + (b.cacheCreationTokens ?? 0),
    cacheReadTokens: (a.cacheReadTokens ?? 0) + (b.cacheReadTokens ?? 0),
  }
}

export async function executeToolLoop(input: ToolLoopInput): Promise<ToolLoopOutput> {
  const invoker = input.invoker ?? invokeModel
  const maxIterations = input.maxIterations ?? DEFAULT_MAX_ITERATIONS
  const messages: MessageParam[] = [...input.initialMessages]
  const toolCalls: ToolCallRecord[] = []
  let usage: TokenUsage = { inputTokens: 0, outputTokens: 0 }
  let lastStopReason: InvokeModelOutput['stopReason'] = null

  for (let iter = 1; iter <= maxIterations; iter++) {
    if (input.shouldAbort && (await input.shouldAbort())) {
      throw new CancelledError()
    }
    const result = await invoker({
      model: input.model,
      ...(input.system ? { system: input.system } : {}),
      messages,
      tools: input.tools,
      ...(input.maxTokens !== undefined ? { maxTokens: input.maxTokens } : {}),
    })
    usage = addUsage(usage, result.usage)
    lastStopReason = result.stopReason

    const hasTools = result.stopReason === 'tool_use' && result.toolUses.length > 0
    if (!hasTools) {
      return {
        text: result.text,
        iterations: iter,
        toolCalls,
        usage,
        finalMessages: messages,
        stopReason: lastStopReason,
      }
    }

    // assistant の応答 (tool_use ブロック含む) を会話に追記
    messages.push({ role: 'assistant', content: result.rawMessage.content })

    // 各 tool を並列実行し、tool_result ブロックを組み立てる
    const toolResultBlocks = await Promise.all(
      result.toolUses.map(async (tu) => {
        const handler = input.handlers[tu.name]
        if (!handler) {
          throw new Error(`executeToolLoop: no handler registered for tool "${tu.name}"`)
        }
        const output = await handler(tu.input)
        toolCalls.push({ name: tu.name, input: tu.input, result: output })
        return {
          type: 'tool_result' as const,
          tool_use_id: tu.id,
          content: output,
        }
      }),
    )
    messages.push({ role: 'user', content: toolResultBlocks })
  }

  throw new Error(
    `executeToolLoop exceeded maxIterations=${maxIterations} (last stop_reason=${lastStopReason}). ` +
      `Agent likely looping on tool_use without convergence.`,
  )
}
