import 'server-only'

import type { Tool } from '@anthropic-ai/sdk/resources/messages'

import type { ToolHandler } from '@/lib/ai/tool-loop'

import type { AgentRole } from '../schema'

/**
 * Tool 実行時に渡される文脈。全ツールで共通。
 * - workspaceId: 必ずこの workspace 内に操作を閉じる (越境不可)
 * - agentId:     作成系ツールの actor 記録に使う
 * - agentRole:   将来 whitelist を role ベースで絞る時の識別子
 */
export interface ToolContext {
  workspaceId: string
  agentId: string
  agentRole: AgentRole
  /**
   * 現在実行中の agent_invocation の id (decompose 専用ツールで staging 行に紐付ける)。
   * decomposeItem 経由で起動された時のみセットされる。通常 run() では undefined。
   */
  agentInvocationId?: string
  /**
   * decompose 専用ツール (`propose_child_item`) の対象親 Item id。
   * decomposeItem で staging mode を有効にした時のみセットされる。
   */
  decomposeParentItemId?: string
}

/**
 * Anthropic Messages API の Tool と handler を束ねた単位。
 * Researcher 起動時に workspace/agent 文脈を bind して `executeToolLoop` に渡す。
 */
export interface ToolBundle {
  tools: Tool[]
  handlers: Record<string, ToolHandler>
}

/**
 * 個別ツールの定義。`build` で ctx を閉じ込めた handler を返す。
 */
export interface AgentToolFactory {
  definition: Tool
  build(ctx: ToolContext): ToolHandler
}
