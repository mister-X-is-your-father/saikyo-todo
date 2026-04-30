/**
 * pm-flow-adapter pure helpers の単体 test。
 *
 * 観点:
 *   - PM_FLOW_TOOL_NAMES が PM_TOOLS と sync している (sentinel)
 *   - buildPmFlowInput が ClaudeFlowInput の必須項目を埋める (role/tools/ws id)
 *   - mapClaudeFlowOutputToPmRunOutput が field rename + drop を正しく行う
 *
 * 注: server-only な PM_TOOLS 本体は import せず、tool 名一覧は本 file の
 * snapshot (handler 名 6 本) と比較する。手動 sync は元 file の comment で明示。
 */
import { describe, expect, it } from 'vitest'

import type { ClaudeFlowOutput } from '@/lib/agent/claude-flow-runner'

import {
  buildPmFlowInput,
  mapClaudeFlowOutputToPmRunOutput,
  PM_FLOW_TOOL_NAMES,
} from './pm-flow-adapter'

describe('pm-flow-adapter', () => {
  describe('PM_FLOW_TOOL_NAMES', () => {
    it('PM_TOOLS の 6 本 (read 4 + write 2) を完全列挙する', () => {
      expect([...PM_FLOW_TOOL_NAMES]).toEqual([
        'read_items',
        'read_docs',
        'search_docs',
        'search_items',
        'write_comment',
        'create_doc',
      ])
    })

    it('create_item / instantiate_template など Researcher 専用 tool は含まない', () => {
      expect([...PM_FLOW_TOOL_NAMES]).not.toContain('create_item')
      expect([...PM_FLOW_TOOL_NAMES]).not.toContain('instantiate_template')
      expect([...PM_FLOW_TOOL_NAMES]).not.toContain('propose_child_item')
    })
  })

  describe('buildPmFlowInput', () => {
    const baseInput = {
      workspaceId: 'ws-1',
      userMessage: 'Stand-up を作って',
      idempotencyKey: 'idem-1',
    }

    it('role を pm に固定して ClaudeFlowInput を組み立てる', () => {
      const out = buildPmFlowInput(baseInput)
      expect(out.role).toBe('pm')
      expect(out.workspaceId).toBe('ws-1')
      expect(out.userMessage).toBe('Stand-up を作って')
      expect(out.idempotencyKey).toBe('idem-1')
    })

    it('allowedToolNames に PM_FLOW_TOOL_NAMES の copy を渡す (mutation 防止)', () => {
      const out = buildPmFlowInput(baseInput)
      expect(out.allowedToolNames).toEqual([...PM_FLOW_TOOL_NAMES])
      // 返り値を改変しても constant が壊れないことを確認
      out.allowedToolNames.push('mutated')
      expect([...PM_FLOW_TOOL_NAMES]).not.toContain('mutated')
    })

    it('targetItemId は null (PM は workspace-level、特定 Item に紐付かない)', () => {
      const out = buildPmFlowInput(baseInput)
      expect(out.targetItemId).toBeNull()
    })

    it('decomposeParentItemId は付けない (分解 staging mode は Researcher 専用)', () => {
      const out = buildPmFlowInput(baseInput)
      expect(out.decomposeParentItemId).toBeUndefined()
    })
  })

  describe('mapClaudeFlowOutputToPmRunOutput', () => {
    const flowOutput: ClaudeFlowOutput = {
      invocationId: 'inv-1',
      agentId: 'agt-1',
      finalText: '本日の MUST は 3 件',
      totalCostUsd: 0.0123,
      inputTokens: 1500,
      outputTokens: 500,
      cacheCreationTokens: 200,
      cacheReadTokens: 1000,
      numTurns: 4,
      toolCallCount: 6,
    }

    it('finalText → text / numTurns → iterations / totalCostUsd → costUsd の rename', () => {
      const out = mapClaudeFlowOutputToPmRunOutput(flowOutput)
      expect(out.text).toBe('本日の MUST は 3 件')
      expect(out.iterations).toBe(4)
      expect(out.costUsd).toBeCloseTo(0.0123)
    })

    it('usage 4 値を nest した object として返す', () => {
      const out = mapClaudeFlowOutputToPmRunOutput(flowOutput)
      expect(out.usage).toEqual({
        inputTokens: 1500,
        outputTokens: 500,
        cacheCreationTokens: 200,
        cacheReadTokens: 1000,
      })
    })

    it('toolCalls は空 array (CLI 経路は per-call detail を expose しない)', () => {
      const out = mapClaudeFlowOutputToPmRunOutput(flowOutput)
      expect(out.toolCalls).toEqual([])
    })

    it('invocationId / agentId は pass-through', () => {
      const out = mapClaudeFlowOutputToPmRunOutput(flowOutput)
      expect(out.invocationId).toBe('inv-1')
      expect(out.agentId).toBe('agt-1')
    })

    it('cache token が 0 でも欠損なく carry-over する (型は number、null ではない)', () => {
      const out = mapClaudeFlowOutputToPmRunOutput({
        ...flowOutput,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
      })
      expect(out.usage.cacheCreationTokens).toBe(0)
      expect(out.usage.cacheReadTokens).toBe(0)
    })
  })
})
