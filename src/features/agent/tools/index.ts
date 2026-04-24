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
export { instantiateTemplateTool } from './template'
export type { AgentToolFactory, ToolBundle, ToolContext } from './types'
export { createDocTool, createItemTool, writeCommentTool } from './write'
