/**
 * researcher-service 用 Anthropic SDK 経路 ⇄ claude CLI 経路 アダプタ (pure helpers)。
 *
 * iter501 で着地した pm-flow-adapter と同パターン。FEEDBACK_QUEUE.md P0 「AI agent
 * を Anthropic SDK 直叩きから claude CLI subprocess 経路へ完全 migration」の iter2
 * substrate (researcher 側)。本 file は pure 関数のみで、test から server-only を
 * 経由せずに input/output / tool 名選択を検証可能にする。
 *
 * researcher は 2 mode を持つ:
 *   - 'researcher' (default): フル tool bundle (read 4 + write 4 = 8 本)
 *   - 'decompose'           : staging mode、propose_child_item で staging 投入 (5 本)
 *
 * sync 規約:
 *   - RESEARCHER_FLOW_TOOL_NAMES / DECOMPOSE_FLOW_TOOL_NAMES は
 *     `src/features/agent/tools/index.ts` の RESEARCHER_TOOLS / DECOMPOSE_TOOLS と一致
 *   - ResearcherRunInput / ResearcherRunOutput と互換な shape
 */
import type { ClaudeFlowInput, ClaudeFlowOutput } from '@/lib/agent/claude-flow-runner'

/**
 * Researcher full mode の MCP tool 名 whitelist。
 * `tools/index.ts` の `RESEARCHER_TOOLS` と sync (read 4 + write 4 = 8 本)。
 */
export const RESEARCHER_FLOW_TOOL_NAMES = [
  'read_items',
  'read_docs',
  'search_docs',
  'search_items',
  'create_item',
  'write_comment',
  'create_doc',
  'instantiate_template',
] as const

/**
 * Researcher decompose mode (AI 分解 staging) の MCP tool 名 whitelist。
 * `tools/index.ts` の `DECOMPOSE_TOOLS` と sync (read 4 + propose_child_item = 5 本)。
 *
 * 注意: `create_item` は除外 (即時 items に書かない)、`propose_child_item` で
 * `agent_decompose_proposals` に staging する設計。`write_comment` / `create_doc` /
 * `instantiate_template` も外して分解中の脱線を防ぐ。
 */
export const DECOMPOSE_FLOW_TOOL_NAMES = [
  'read_items',
  'read_docs',
  'search_docs',
  'search_items',
  'propose_child_item',
] as const

export interface ResearcherFlowAdapterInput {
  workspaceId: string
  userMessage: string
  idempotencyKey: string
  targetItemId?: string | null
  /** 'researcher' (default) or 'decompose'. */
  toolMode?: 'researcher' | 'decompose'
  /** toolMode='decompose' で必須。propose_child_item の親 Item id。 */
  decomposeParentItemId?: string
}

/**
 * ResearcherRunInput data fields → ClaudeFlowInput への変換。
 *
 * - toolMode='decompose' の時のみ `allowedToolNames` を DECOMPOSE_FLOW_TOOL_NAMES に
 *   切替 + `decomposeParentItemId` を ClaudeFlowInput にも詰める (MCP server が
 *   staging mode で起動するため)
 * - toolMode 省略時は 'researcher' (フル tool bundle) として扱う
 */
export function buildResearcherFlowInput(input: ResearcherFlowAdapterInput): ClaudeFlowInput {
  const isDecompose = input.toolMode === 'decompose'
  const allowedToolNames = isDecompose
    ? [...DECOMPOSE_FLOW_TOOL_NAMES]
    : [...RESEARCHER_FLOW_TOOL_NAMES]

  return {
    workspaceId: input.workspaceId,
    role: 'researcher',
    userMessage: input.userMessage,
    allowedToolNames,
    idempotencyKey: input.idempotencyKey,
    targetItemId: input.targetItemId ?? null,
    ...(isDecompose && input.decomposeParentItemId
      ? { decomposeParentItemId: input.decomposeParentItemId }
      : {}),
  }
}

export interface ResearcherFlowAdapterOutput {
  invocationId: string
  agentId: string
  text: string
  toolCalls: Array<{ name: string; input: unknown; result: string }>
  iterations: number
  usage: {
    inputTokens: number
    outputTokens: number
    cacheCreationTokens?: number | null
    cacheReadTokens?: number | null
  }
  costUsd: number
}

/**
 * ClaudeFlowOutput を ResearcherRunOutput 互換 shape に整える。
 * pm-flow-adapter と同一のロジックだが、type alias を分けて意図を明示する
 * (Researcher 側で将来 toolCalls の partial reconstruction 等が入った時のため)。
 *
 * 注意: claude CLI 経路は per-call の tool input/result を expose しないため
 * `toolCalls` は空 array。詳細を見たい呼び出し側は invocationId 経由で
 * `agent_invocations.output` から再取得する想定。
 */
export function mapClaudeFlowOutputToResearcherRunOutput(
  flowOutput: ClaudeFlowOutput,
): ResearcherFlowAdapterOutput {
  return {
    invocationId: flowOutput.invocationId,
    agentId: flowOutput.agentId,
    text: flowOutput.finalText,
    toolCalls: [],
    iterations: flowOutput.numTurns,
    usage: {
      inputTokens: flowOutput.inputTokens,
      outputTokens: flowOutput.outputTokens,
      cacheCreationTokens: flowOutput.cacheCreationTokens,
      cacheReadTokens: flowOutput.cacheReadTokens,
    },
    costUsd: flowOutput.totalCostUsd,
  }
}
