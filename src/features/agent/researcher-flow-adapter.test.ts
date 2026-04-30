/**
 * researcher-flow-adapter pure helpers の単体 test。
 *
 * 観点:
 *   - RESEARCHER_FLOW_TOOL_NAMES / DECOMPOSE_FLOW_TOOL_NAMES が tools/index.ts と sync
 *   - buildResearcherFlowInput が toolMode で tool 一覧を切替 + decomposeParentItemId
 *     を decompose mode 時のみ詰める
 *   - mapClaudeFlowOutputToResearcherRunOutput が field rename + drop を正しく行う
 */
import { describe, expect, it } from 'vitest'

import type { ClaudeFlowOutput } from '@/lib/agent/claude-flow-runner'

import {
  buildResearcherFlowInput,
  DECOMPOSE_FLOW_TOOL_NAMES,
  mapClaudeFlowOutputToResearcherRunOutput,
  RESEARCH_FLOW_TOOL_NAMES,
  RESEARCHER_FLOW_TOOL_NAMES,
} from './researcher-flow-adapter'

describe('researcher-flow-adapter', () => {
  describe('RESEARCHER_FLOW_TOOL_NAMES', () => {
    it('RESEARCHER_TOOLS の 8 本 (read 4 + write 4) を完全列挙する', () => {
      expect([...RESEARCHER_FLOW_TOOL_NAMES]).toEqual([
        'read_items',
        'read_docs',
        'search_docs',
        'search_items',
        'create_item',
        'write_comment',
        'create_doc',
        'instantiate_template',
      ])
    })

    it('propose_child_item は含まない (decompose staging 専用)', () => {
      expect([...RESEARCHER_FLOW_TOOL_NAMES]).not.toContain('propose_child_item')
    })

    it('delete_* は含まない (MVP は agent に渡さない)', () => {
      expect([...RESEARCHER_FLOW_TOOL_NAMES].filter((n) => n.startsWith('delete_'))).toEqual([])
    })
  })

  describe('DECOMPOSE_FLOW_TOOL_NAMES', () => {
    it('read 4 + propose_child_item の 5 本のみ', () => {
      expect([...DECOMPOSE_FLOW_TOOL_NAMES]).toEqual([
        'read_items',
        'read_docs',
        'search_docs',
        'search_items',
        'propose_child_item',
      ])
    })

    it('create_item / write_comment / create_doc / instantiate_template は含まない', () => {
      const names = [...DECOMPOSE_FLOW_TOOL_NAMES]
      expect(names).not.toContain('create_item')
      expect(names).not.toContain('write_comment')
      expect(names).not.toContain('create_doc')
      expect(names).not.toContain('instantiate_template')
    })
  })

  describe('RESEARCH_FLOW_TOOL_NAMES', () => {
    it('read 4 + create_doc の 5 本のみ (調査 → Doc 作成)', () => {
      expect([...RESEARCH_FLOW_TOOL_NAMES]).toEqual([
        'read_items',
        'read_docs',
        'search_docs',
        'search_items',
        'create_doc',
      ])
    })

    it('create_item / write_comment / propose_child_item / instantiate_template は含まない', () => {
      const names = [...RESEARCH_FLOW_TOOL_NAMES]
      expect(names).not.toContain('create_item')
      expect(names).not.toContain('write_comment')
      expect(names).not.toContain('propose_child_item')
      expect(names).not.toContain('instantiate_template')
    })
  })

  describe('buildResearcherFlowInput', () => {
    const baseInput = {
      workspaceId: 'ws-1',
      userMessage: 'AI 分解して',
      idempotencyKey: 'idem-1',
    }

    it('toolMode 省略時は researcher full bundle (8 本)', () => {
      const out = buildResearcherFlowInput(baseInput)
      expect(out.role).toBe('researcher')
      expect(out.allowedToolNames).toEqual([...RESEARCHER_FLOW_TOOL_NAMES])
      expect(out.allowedToolNames).toHaveLength(8)
    })

    it('toolMode=researcher は full bundle (省略時と同じ)', () => {
      const out = buildResearcherFlowInput({ ...baseInput, toolMode: 'researcher' })
      expect(out.allowedToolNames).toEqual([...RESEARCHER_FLOW_TOOL_NAMES])
    })

    it('toolMode=decompose は decompose bundle (5 本) + decomposeParentItemId を詰める', () => {
      const out = buildResearcherFlowInput({
        ...baseInput,
        toolMode: 'decompose',
        decomposeParentItemId: 'parent-1',
      })
      expect(out.allowedToolNames).toEqual([...DECOMPOSE_FLOW_TOOL_NAMES])
      expect(out.allowedToolNames).toHaveLength(5)
      expect(out.decomposeParentItemId).toBe('parent-1')
    })

    it('toolMode=research は research bundle (5 本) + decomposeParentItemId は drop', () => {
      const out = buildResearcherFlowInput({
        ...baseInput,
        toolMode: 'research',
        decomposeParentItemId: 'parent-X',
      })
      expect(out.allowedToolNames).toEqual([...RESEARCH_FLOW_TOOL_NAMES])
      expect(out.allowedToolNames).toHaveLength(5)
      expect(out.decomposeParentItemId).toBeUndefined()
    })

    it('toolMode=researcher の時は decomposeParentItemId を渡しても drop する', () => {
      const out = buildResearcherFlowInput({
        ...baseInput,
        toolMode: 'researcher',
        decomposeParentItemId: 'parent-1',
      })
      expect(out.decomposeParentItemId).toBeUndefined()
    })

    it('targetItemId は input から pass-through (default は null)', () => {
      expect(buildResearcherFlowInput(baseInput).targetItemId).toBeNull()
      expect(buildResearcherFlowInput({ ...baseInput, targetItemId: 'item-7' }).targetItemId).toBe(
        'item-7',
      )
    })

    it('返り値の allowedToolNames を改変しても constant は壊れない (copy で渡す)', () => {
      const out = buildResearcherFlowInput(baseInput)
      out.allowedToolNames.push('mutated')
      expect([...RESEARCHER_FLOW_TOOL_NAMES]).not.toContain('mutated')
    })
  })

  describe('mapClaudeFlowOutputToResearcherRunOutput', () => {
    const flowOutput: ClaudeFlowOutput = {
      invocationId: 'inv-7',
      agentId: 'agt-7',
      finalText: '分解結果 5 件',
      totalCostUsd: 0.0456,
      inputTokens: 3000,
      outputTokens: 1200,
      cacheCreationTokens: 500,
      cacheReadTokens: 2000,
      numTurns: 8,
      toolCallCount: 14,
    }

    it('finalText → text / numTurns → iterations / totalCostUsd → costUsd の rename', () => {
      const out = mapClaudeFlowOutputToResearcherRunOutput(flowOutput)
      expect(out.text).toBe('分解結果 5 件')
      expect(out.iterations).toBe(8)
      expect(out.costUsd).toBeCloseTo(0.0456)
    })

    it('usage 4 値を nest した object として返す', () => {
      const out = mapClaudeFlowOutputToResearcherRunOutput(flowOutput)
      expect(out.usage).toEqual({
        inputTokens: 3000,
        outputTokens: 1200,
        cacheCreationTokens: 500,
        cacheReadTokens: 2000,
      })
    })

    it('toolCalls は空 array (CLI 経路は per-call detail を expose しない)', () => {
      const out = mapClaudeFlowOutputToResearcherRunOutput(flowOutput)
      expect(out.toolCalls).toEqual([])
    })

    it('invocationId / agentId は pass-through', () => {
      const out = mapClaudeFlowOutputToResearcherRunOutput(flowOutput)
      expect(out.invocationId).toBe('inv-7')
      expect(out.agentId).toBe('agt-7')
    })
  })
})
