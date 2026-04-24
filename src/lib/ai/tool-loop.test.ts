import { describe, expect, it, vi } from 'vitest'

import type { InvokeModelOutput } from './invoke'
import { executeToolLoop, type ToolLoopInput } from './tool-loop'

function buildInvokeResult(overrides: Partial<InvokeModelOutput> = {}): InvokeModelOutput {
  return {
    text: '',
    toolUses: [],
    usage: { inputTokens: 10, outputTokens: 5 },
    stopReason: 'end_turn',
    model: 'claude-haiku-4-5',
    rawMessage: { content: [] } as unknown as InvokeModelOutput['rawMessage'],
    ...overrides,
  }
}

function baseInput(overrides: Partial<ToolLoopInput> = {}): ToolLoopInput {
  return {
    model: 'claude-haiku-4-5',
    initialMessages: [{ role: 'user', content: 'do the thing' }],
    tools: [
      {
        name: 'echo',
        description: 'echo back the input',
        input_schema: { type: 'object', properties: {} } as never,
      },
    ],
    handlers: { echo: async (input) => JSON.stringify(input) },
    ...overrides,
  }
}

describe('executeToolLoop', () => {
  it('tool を呼ばない応答は 1 回で返る (iterations=1)', async () => {
    const invoker = vi
      .fn()
      .mockResolvedValueOnce(buildInvokeResult({ text: 'hello', stopReason: 'end_turn' }))
    const r = await executeToolLoop(baseInput({ invoker }))
    expect(r.iterations).toBe(1)
    expect(r.text).toBe('hello')
    expect(r.toolCalls).toHaveLength(0)
    expect(invoker).toHaveBeenCalledTimes(1)
  })

  it('tool を 1 回呼んで終わる (iterations=2、handler 実行、usage 累積)', async () => {
    const invoker = vi
      .fn()
      .mockResolvedValueOnce(
        buildInvokeResult({
          stopReason: 'tool_use',
          toolUses: [{ id: 't1', name: 'echo', input: { msg: 'hi' } }],
          rawMessage: {
            content: [{ type: 'tool_use', id: 't1', name: 'echo', input: { msg: 'hi' } }],
          } as never,
          usage: { inputTokens: 100, outputTokens: 20 },
        }),
      )
      .mockResolvedValueOnce(
        buildInvokeResult({
          text: '完了しました',
          stopReason: 'end_turn',
          usage: { inputTokens: 120, outputTokens: 10 },
        }),
      )

    const handler = vi.fn(async (input: unknown) => `echoed: ${JSON.stringify(input)}`)
    const r = await executeToolLoop(baseInput({ invoker, handlers: { echo: handler } }))

    expect(r.iterations).toBe(2)
    expect(r.text).toBe('完了しました')
    expect(r.toolCalls).toEqual([
      { name: 'echo', input: { msg: 'hi' }, result: 'echoed: {"msg":"hi"}' },
    ])
    expect(handler).toHaveBeenCalledWith({ msg: 'hi' })
    expect(r.usage).toEqual({
      inputTokens: 220,
      outputTokens: 30,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
    })
  })

  it('同一応答内の複数 tool_use を並列実行', async () => {
    const invoker = vi
      .fn()
      .mockResolvedValueOnce(
        buildInvokeResult({
          stopReason: 'tool_use',
          toolUses: [
            { id: 't1', name: 'echo', input: { n: 1 } },
            { id: 't2', name: 'echo', input: { n: 2 } },
          ],
          rawMessage: {
            content: [
              { type: 'tool_use', id: 't1', name: 'echo', input: { n: 1 } },
              { type: 'tool_use', id: 't2', name: 'echo', input: { n: 2 } },
            ],
          } as never,
        }),
      )
      .mockResolvedValueOnce(buildInvokeResult({ text: 'done', stopReason: 'end_turn' }))

    const r = await executeToolLoop(baseInput({ invoker }))
    expect(r.iterations).toBe(2)
    expect(r.toolCalls.map((c) => c.input)).toEqual([{ n: 1 }, { n: 2 }])
  })

  it('存在しない tool 名が来たら例外 (handler 欠落)', async () => {
    const invoker = vi.fn().mockResolvedValueOnce(
      buildInvokeResult({
        stopReason: 'tool_use',
        toolUses: [{ id: 't1', name: 'unknown', input: {} }],
        rawMessage: {
          content: [{ type: 'tool_use', id: 't1', name: 'unknown', input: {} }],
        } as never,
      }),
    )
    await expect(executeToolLoop(baseInput({ invoker }))).rejects.toThrow(/no handler/)
  })

  it('maxIterations を超えたら例外 (無限ループ防止)', async () => {
    // 常に tool_use を返す invoker
    const invoker = vi.fn().mockResolvedValue(
      buildInvokeResult({
        stopReason: 'tool_use',
        toolUses: [{ id: 't1', name: 'echo', input: {} }],
        rawMessage: {
          content: [{ type: 'tool_use', id: 't1', name: 'echo', input: {} }],
        } as never,
      }),
    )
    await expect(executeToolLoop(baseInput({ invoker, maxIterations: 3 }))).rejects.toThrow(
      /exceeded maxIterations=3/,
    )
    expect(invoker).toHaveBeenCalledTimes(3)
  })

  it('handlers で非同期の遅延があっても結果を蓄積する', async () => {
    const invoker = vi
      .fn()
      .mockResolvedValueOnce(
        buildInvokeResult({
          stopReason: 'tool_use',
          toolUses: [{ id: 't1', name: 'echo', input: { delay: true } }],
          rawMessage: {
            content: [{ type: 'tool_use', id: 't1', name: 'echo', input: { delay: true } }],
          } as never,
        }),
      )
      .mockResolvedValueOnce(buildInvokeResult({ text: 'ok', stopReason: 'end_turn' }))
    const slow: Record<string, (input: unknown) => Promise<string>> = {
      echo: async (input) => {
        await new Promise((r) => setTimeout(r, 10))
        return `slow:${JSON.stringify(input)}`
      },
    }
    const r = await executeToolLoop(baseInput({ invoker, handlers: slow }))
    expect(r.toolCalls[0]?.result).toBe('slow:{"delay":true}')
  })
})
