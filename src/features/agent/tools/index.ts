/**
 * Researcher tool whitelist とバンドラ。
 *
 * `buildResearcherTools(ctx)` が ctx (workspaceId + agentId) を各ツールに閉じ込めた
 * `{ tools, handlers }` を返す。これを `executeToolLoop` にそのまま渡す。
 *
 * Day 21 時点の whitelist (8 本):
 *   - read_items / read_docs / search_docs / search_items     (read)
 *   - create_item / write_comment / create_doc                (write)
 *   - instantiate_template                                    (template)
 *
 * `delete_*` は MVP で Agent に渡さない (CLAUDE.md §2)。
 */
import 'server-only'

import { readDocsTool, readItemsTool, searchDocsTool, searchItemsTool } from './read'
import { instantiateTemplateTool } from './template'
import type { AgentToolFactory, ToolBundle, ToolContext } from './types'
import { createDocTool, createItemTool, writeCommentTool } from './write'

export const RESEARCHER_TOOLS: AgentToolFactory[] = [
  readItemsTool,
  readDocsTool,
  searchDocsTool,
  searchItemsTool,
  createItemTool,
  writeCommentTool,
  createDocTool,
  instantiateTemplateTool,
]

/**
 * PM Agent の tool whitelist。Researcher から以下を除外:
 *   - create_item / instantiate_template: 分解 / Template 展開は Researcher の領分
 * PM は stand-up + heartbeat + ヒアリング中心なので read + comment + 記録用 doc で十分。
 */
export const PM_TOOLS: AgentToolFactory[] = [
  readItemsTool,
  readDocsTool,
  searchDocsTool,
  searchItemsTool,
  writeCommentTool,
  createDocTool,
]

export function buildResearcherTools(
  ctx: ToolContext,
  overrideFactories?: AgentToolFactory[],
): ToolBundle {
  const factories = overrideFactories ?? RESEARCHER_TOOLS
  const tools = factories.map((f) => f.definition)
  const handlers: Record<string, ReturnType<AgentToolFactory['build']>> = {}
  for (const f of factories) {
    handlers[f.definition.name] = f.build(ctx)
  }
  return { tools, handlers }
}

/** PM Agent 用バンドラ (tool 集合以外は buildResearcherTools と同じ実装)。 */
export function buildPmTools(ctx: ToolContext): ToolBundle {
  const tools = PM_TOOLS.map((f) => f.definition)
  const handlers: Record<string, ReturnType<AgentToolFactory['build']>> = {}
  for (const f of PM_TOOLS) {
    handlers[f.definition.name] = f.build(ctx)
  }
  return { tools, handlers }
}

export { readDocsTool, readItemsTool, searchDocsTool, searchItemsTool } from './read'
export { instantiateTemplateTool } from './template'
export type { AgentToolFactory, ToolBundle, ToolContext } from './types'
export { createDocTool, createItemTool, writeCommentTool } from './write'
