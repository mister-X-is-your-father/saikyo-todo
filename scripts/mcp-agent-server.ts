/**
 * stdio MCP サーバ: アプリの Agent 用 tool ハンドラを MCP protocol で公開する。
 * claude CLI から `--mcp-config` で起動されると、アプリの DB に対して直接書き込める。
 *
 * context は env vars で受け取る:
 *   - WORKSPACE_ID   : ctx.workspaceId
 *   - AGENT_ID       : ctx.agentId
 *   - AGENT_ROLE     : ctx.agentRole ('researcher' | 'pm')
 *   - TOOL_WHITELIST : カンマ区切りで公開するツール名 (省略時は全 Researcher tools)
 *
 * MCP protocol 上のツール名は Anthropic Messages API と同じ (create_item 等)。
 * 入出力は JSON 文字列 (ハンドラの戻り値をそのまま MCP TextContent として返す)。
 */
import 'server-only'

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'

import { PM_TOOLS, RESEARCHER_TOOLS, type ToolContext } from '@/features/agent/tools'

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`${name} env var is required`)
  return v
}

const agentRoleRaw = process.env.AGENT_ROLE ?? 'researcher'
if (agentRoleRaw !== 'researcher' && agentRoleRaw !== 'pm') {
  throw new Error(`AGENT_ROLE must be 'researcher' or 'pm', got: ${agentRoleRaw}`)
}

const ctx: ToolContext = {
  workspaceId: requireEnv('WORKSPACE_ID'),
  agentId: requireEnv('AGENT_ID'),
  agentRole: agentRoleRaw,
}

const whitelist = (process.env.TOOL_WHITELIST ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

const roleTools = ctx.agentRole === 'pm' ? PM_TOOLS : RESEARCHER_TOOLS
const factories = roleTools.filter(
  (f) => whitelist.length === 0 || whitelist.includes(f.definition.name),
)
const handlers = Object.fromEntries(factories.map((f) => [f.definition.name, f.build(ctx)]))

const server = new Server(
  { name: 'saikyo-todo-agent-tools', version: '0.1.0' },
  { capabilities: { tools: {} } },
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: factories.map((f) => ({
    name: f.definition.name,
    description: f.definition.description ?? '',
    inputSchema: f.definition.input_schema as Record<string, unknown>,
  })),
}))

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const name = req.params.name
  const handler = handlers[name]
  if (!handler) {
    return {
      isError: true,
      content: [
        { type: 'text', text: JSON.stringify({ ok: false, error: `unknown tool: ${name}` }) },
      ],
    }
  }
  const result = await handler((req.params.arguments ?? {}) as Record<string, unknown>)
  return { content: [{ type: 'text', text: result }] }
})

const transport = new StdioServerTransport()
await server.connect(transport)
// keep process alive; transport will close on stdin EOF
