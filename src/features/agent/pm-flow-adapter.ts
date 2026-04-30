/**
 * pm-service 用 Anthropic SDK 経路 ⇄ claude CLI 経路 アダプタ (pure helpers)。
 *
 * FEEDBACK_QUEUE.md P0 「AI agent を Anthropic SDK 直叩きから claude CLI subprocess
 * 経路へ完全 migration」の iter1 substrate。本 file は pure 関数のみを置き、test
 * から server-only を経由せずに input/output 変換を検証可能にする。
 *
 * iter2 で `pm-service.ts` の `executeToolLoop` 呼び出しを `runFlowViaClaude` に
 * 差し替えたとき、本 helper を呼ぶだけで PmRunInput / PmRunOutput 互換が保てる。
 *
 * sync 規約:
 *   - PM_FLOW_TOOL_NAMES は src/features/agent/tools/index.ts の PM_TOOLS と
 *     完全一致させる (test で sentinel 検査、ズレたら fail)
 *   - PmRunInput / PmRunOutput と互換な形を保つ (pm-service.ts の type と一致)
 */
import type { ClaudeFlowInput, ClaudeFlowOutput } from '@/lib/agent/claude-flow-runner'

/**
 * PM agent が claude CLI 経路で公開する MCP tool 名 whitelist。
 * `src/features/agent/tools/index.ts` の `PM_TOOLS` と sync (read 4 + write 2)。
 */
export const PM_FLOW_TOOL_NAMES = [
  'read_items',
  'read_docs',
  'search_docs',
  'search_items',
  'write_comment',
  'create_doc',
] as const

export interface PmFlowAdapterInput {
  workspaceId: string
  userMessage: string
  idempotencyKey: string
}

/**
 * PmRunInput の data fields を ClaudeFlowInput に変換する。
 * `invoker` (SDK 経路 DI) は CLI 経路では使わないので drop。
 */
export function buildPmFlowInput(input: PmFlowAdapterInput): ClaudeFlowInput {
  return {
    workspaceId: input.workspaceId,
    role: 'pm',
    userMessage: input.userMessage,
    allowedToolNames: [...PM_FLOW_TOOL_NAMES],
    idempotencyKey: input.idempotencyKey,
    targetItemId: null,
  }
}

export interface PmFlowAdapterOutput {
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
 * ClaudeFlowOutput を PmRunOutput 互換 shape に整える。
 *
 * 注意: claude CLI 経路は per-call の tool input/result を stream-json で expose
 * しないため `toolCalls` は空 array。詳細を見たい呼び出し側は invocationId 経由で
 * `agent_invocations.output` から再取得する想定。`numTurns` を `iterations` に、
 * `totalCostUsd` を `costUsd` にそれぞれ rename して返す。
 */
export function mapClaudeFlowOutputToPmRunOutput(
  flowOutput: ClaudeFlowOutput,
): PmFlowAdapterOutput {
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
