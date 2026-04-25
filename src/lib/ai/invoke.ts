/**
 * Anthropic Messages API のラッパ (非ストリーミング `invokeModel` +
 * テキスト delta コールバック対応 `invokeModelStream`)。
 * レスポンスを normalized な shape に畳み、Service 層では ExternalServiceError だけ意識すればよいようにする。
 */
import 'server-only'

import type { Message, MessageParam, Tool } from '@anthropic-ai/sdk/resources/messages'

import { ExternalServiceError } from '@/lib/errors'

import { getAnthropicClient } from './client'
import type { TokenUsage } from './pricing'

export interface InvokeModelInput {
  model: string
  system?: string
  messages: MessageParam[]
  tools?: Tool[]
  maxTokens?: number
}

export interface ToolUseCall {
  id: string
  name: string
  input: unknown
}

export interface InvokeModelOutput {
  text: string
  toolUses: ToolUseCall[]
  usage: TokenUsage
  stopReason: Message['stop_reason']
  model: string
  rawMessage: Message
}

export async function invokeModel(input: InvokeModelInput): Promise<InvokeModelOutput> {
  const client = getAnthropicClient()
  let msg: Message
  try {
    msg = await client.messages.create({
      model: input.model,
      max_tokens: input.maxTokens ?? 4096,
      ...(input.system ? { system: input.system } : {}),
      messages: input.messages,
      ...(input.tools ? { tools: input.tools } : {}),
    })
  } catch (e) {
    throw new ExternalServiceError('Anthropic', e)
  }

  const text = msg.content
    .filter((b): b is Extract<Message['content'][number], { type: 'text' }> => b.type === 'text')
    .map((b) => b.text)
    .join('')

  const toolUses: ToolUseCall[] = msg.content
    .filter(
      (b): b is Extract<Message['content'][number], { type: 'tool_use' }> => b.type === 'tool_use',
    )
    .map((b) => ({ id: b.id, name: b.name, input: b.input }))

  return {
    text,
    toolUses,
    usage: {
      inputTokens: msg.usage.input_tokens,
      outputTokens: msg.usage.output_tokens,
      cacheCreationTokens: msg.usage.cache_creation_input_tokens,
      cacheReadTokens: msg.usage.cache_read_input_tokens,
    },
    stopReason: msg.stop_reason,
    model: msg.model,
    rawMessage: msg,
  }
}

export interface InvokeStreamCallbacks {
  /** テキスト delta が到着するたびに呼ばれる (UI への push に使う)。 */
  onTextDelta?: (delta: string) => void
}

/**
 * Streaming 版。`messages.stream` を使い、テキスト delta を `callbacks.onTextDelta` に流す。
 * 戻り値は非ストリーミングと同じ `InvokeModelOutput` 形 (final message から組み立てる)。
 *
 * tool_use を含むレスポンスでも問題なく動く (final message には text + tool_use の両方が入る)。
 */
export async function invokeModelStream(
  input: InvokeModelInput,
  callbacks: InvokeStreamCallbacks = {},
): Promise<InvokeModelOutput> {
  const client = getAnthropicClient()
  let msg: Message
  try {
    const stream = client.messages.stream({
      model: input.model,
      max_tokens: input.maxTokens ?? 4096,
      ...(input.system ? { system: input.system } : {}),
      messages: input.messages,
      ...(input.tools ? { tools: input.tools } : {}),
    })
    if (callbacks.onTextDelta) {
      stream.on('text', (delta) => callbacks.onTextDelta!(delta))
    }
    msg = await stream.finalMessage()
  } catch (e) {
    throw new ExternalServiceError('Anthropic', e)
  }

  const text = msg.content
    .filter((b): b is Extract<Message['content'][number], { type: 'text' }> => b.type === 'text')
    .map((b) => b.text)
    .join('')

  const toolUses: ToolUseCall[] = msg.content
    .filter(
      (b): b is Extract<Message['content'][number], { type: 'tool_use' }> => b.type === 'tool_use',
    )
    .map((b) => ({ id: b.id, name: b.name, input: b.input }))

  return {
    text,
    toolUses,
    usage: {
      inputTokens: msg.usage.input_tokens,
      outputTokens: msg.usage.output_tokens,
      cacheCreationTokens: msg.usage.cache_creation_input_tokens,
      cacheReadTokens: msg.usage.cache_read_input_tokens,
    },
    stopReason: msg.stop_reason,
    model: msg.model,
    rawMessage: msg,
  }
}

/**
 * `executeToolLoop` の `invoker` として渡せる streaming 版を生成する factory。
 * researcherService.run などで `invoker: streamingInvoker(onDelta)` の形で使う。
 */
export function streamingInvoker(
  onTextDelta: (delta: string) => void,
): (args: InvokeModelInput) => Promise<InvokeModelOutput> {
  return (args) => invokeModelStream(args, { onTextDelta })
}
