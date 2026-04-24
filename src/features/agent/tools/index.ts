/**
 * Researcher tool whitelist とバンドラ。
 *
 * `buildResearcherTools(ctx)` が ctx (workspaceId + agentId) を各ツールに閉じ込めた
 * `{ tools, handlers }` を返す。これを `executeToolLoop` にそのまま渡す。
 *
 * Day 18-20 時点の whitelist:
 *   - read_items / read_docs / search_docs / search_items     (read)
 *   - create_item / write_comment / create_doc                (write)
 *
 * `instantiate_template` は Day 21 (Researcher → Template 起動 + 自動起動) で追加予定。
 * `delete_*` は MVP で Agent に渡さない (CLAUDE.md §2)。
 */
import 'server-only'

import { readDocsTool, readItemsTool, searchDocsTool, searchItemsTool } from './read'
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

export { readDocsTool, readItemsTool, searchDocsTool, searchItemsTool } from './read'
export type { AgentToolFactory, ToolBundle, ToolContext } from './types'
export { createDocTool, createItemTool, writeCommentTool } from './write'
