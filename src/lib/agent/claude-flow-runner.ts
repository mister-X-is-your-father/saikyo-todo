/**
 * claude CLI を subprocess として起動し、アプリの MCP tool サーバを付けて Agent フローを実行する。
 *
 * 注意:
 *   - executeToolLoop / agentMemoryService は経由しない (MVP 受け入れ検証の代替経路)
 *   - claude CLI は Max プラン OAuth で認証される (ANTHROPIC_API_KEY 不要)
 */
import 'server-only'

import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'

import { recordAudit } from '@/lib/audit'
import { adminDb } from '@/lib/db/scoped-client'

import { agentInvocationRepository } from '@/features/agent/repository'
import { ENGINEER_ROLE } from '@/features/agent/roles/engineer'
import { PM_ROLE } from '@/features/agent/roles/pm'
import { RESEARCHER_ROLE } from '@/features/agent/roles/researcher'
import { REVIEWER_ROLE } from '@/features/agent/roles/reviewer'
import type { AgentRole } from '@/features/agent/schema'
import { agentService } from '@/features/agent/service'

export interface ClaudeFlowInput {
  workspaceId: string
  role: AgentRole // 'researcher' | 'pm'
  userMessage: string
  /** Anthropic tool 名の whitelist (MCP tool 名と同じ) */
  allowedToolNames: string[]
  targetItemId?: string | null
  idempotencyKey?: string
}

export interface ClaudeFlowOutput {
  invocationId: string
  agentId: string
  finalText: string
  totalCostUsd: number
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
  numTurns: number
  toolCallCount: number
}

interface StreamJsonResult {
  type: 'result'
  is_error: boolean
  result: string
  total_cost_usd: number
  num_turns: number
  usage: {
    input_tokens: number
    output_tokens: number
    cache_creation_input_tokens: number
    cache_read_input_tokens: number
  }
}

interface StreamJsonAssistant {
  type: 'assistant'
  message: {
    content: Array<{ type: string }>
  }
}

/**
 * 全モデル ID マッピング。claude CLI は alias (haiku/sonnet) も受け付けるが、
 * agent_invocations.model には schema と一致する full ID を書きたい。
 */
const ROLE_CONFIG = {
  researcher: RESEARCHER_ROLE,
  pm: PM_ROLE,
  engineer: ENGINEER_ROLE,
  reviewer: REVIEWER_ROLE,
} as const satisfies Record<
  AgentRole,
  { model: string; systemPrompt: string; maxIterations: number }
>

/**
 * MCP 子プロセスに引き渡す env 変数の一覧。未設定なら undefined のまま渡す
 * (= claude CLI 側が継承する)。
 */
const INHERITED_ENV_VARS = [
  'PATH',
  'HOME',
  'POSTGRES_URL',
  'DATABASE_URL',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const

export async function runFlowViaClaude(input: ClaudeFlowInput): Promise<ClaudeFlowOutput> {
  const role = ROLE_CONFIG[input.role]
  const agent = await agentService.ensureAgent(input.workspaceId, input.role)
  const idempotencyKey = input.idempotencyKey ?? randomUUID()

  const invocation = await adminDb.transaction((tx) =>
    agentInvocationRepository.insert(tx, {
      agentId: agent.id,
      workspaceId: input.workspaceId,
      targetItemId: input.targetItemId ?? null,
      status: 'queued',
      input: {
        userMessage: input.userMessage,
        role: input.role,
        via: 'claude-cli',
      } as never,
      model: role.model,
      idempotencyKey,
    }),
  )
  await adminDb.transaction((tx) =>
    agentInvocationRepository.update(tx, invocation.id, {
      status: 'running',
      startedAt: new Date(),
    }),
  )

  try {
    const result = await spawnClaude({
      workspaceId: input.workspaceId,
      agentId: agent.id,
      role: input.role,
      systemPrompt: role.systemPrompt,
      userMessage: input.userMessage,
      allowedToolNames: input.allowedToolNames,
      model: role.model,
    })

    const costStr = result.totalCostUsd.toFixed(6)
    await adminDb.transaction(async (tx) => {
      await agentInvocationRepository.update(tx, invocation.id, {
        status: 'completed',
        output: {
          text: result.finalText,
          numTurns: result.numTurns,
          toolCallCount: result.toolCallCount,
          via: 'claude-cli',
        } as never,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        cacheCreationTokens: result.cacheCreationTokens,
        cacheReadTokens: result.cacheReadTokens,
        costUsd: costStr,
        finishedAt: new Date(),
      })
      await recordAudit(tx, {
        workspaceId: input.workspaceId,
        actorType: 'agent',
        actorId: agent.id,
        targetType: 'agent_invocation',
        targetId: invocation.id,
        action: 'complete',
        after: {
          status: 'completed',
          costUsd: costStr,
          toolCallCount: result.toolCallCount,
          numTurns: result.numTurns,
          via: 'claude-cli',
        },
      })
    })

    return {
      invocationId: invocation.id,
      agentId: agent.id,
      finalText: result.finalText,
      totalCostUsd: result.totalCostUsd,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      cacheCreationTokens: result.cacheCreationTokens,
      cacheReadTokens: result.cacheReadTokens,
      numTurns: result.numTurns,
      toolCallCount: result.toolCallCount,
    }
  } catch (e) {
    const errorMessage = (e instanceof Error ? e.message : String(e)).slice(0, 2000)
    await adminDb.transaction(async (tx) => {
      await agentInvocationRepository.update(tx, invocation.id, {
        status: 'failed',
        errorMessage,
        finishedAt: new Date(),
      })
      await recordAudit(tx, {
        workspaceId: input.workspaceId,
        actorType: 'agent',
        actorId: agent.id,
        targetType: 'agent_invocation',
        targetId: invocation.id,
        action: 'fail',
        after: { status: 'failed', errorMessage, via: 'claude-cli' },
      })
    })
    throw e
  }
}

interface SpawnInput {
  workspaceId: string
  agentId: string
  role: AgentRole
  systemPrompt: string
  userMessage: string
  allowedToolNames: string[]
  model: string
}

interface SpawnResult {
  finalText: string
  totalCostUsd: number
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
  numTurns: number
  toolCallCount: number
}

function buildInheritedEnv(): Record<string, string> {
  const env: Record<string, string> = {}
  for (const key of INHERITED_ENV_VARS) {
    const v = process.env[key]
    if (v !== undefined) env[key] = v
  }
  return env
}

async function spawnClaude(input: SpawnInput): Promise<SpawnResult> {
  const mcpConfig = {
    mcpServers: {
      app: {
        command: 'pnpm',
        args: ['tsx', 'scripts/mcp-agent-server.ts'],
        env: {
          ...buildInheritedEnv(),
          NODE_OPTIONS: '--conditions=react-server',
          WORKSPACE_ID: input.workspaceId,
          AGENT_ID: input.agentId,
          AGENT_ROLE: input.role,
          TOOL_WHITELIST: input.allowedToolNames.join(','),
        },
      },
    },
  }

  const mcpAllowed = input.allowedToolNames.map((n) => `mcp__app__${n}`).join(',')

  return await new Promise<SpawnResult>((resolve, reject) => {
    const args = [
      '-p',
      '--model',
      input.model,
      '--system-prompt',
      input.systemPrompt,
      '--mcp-config',
      JSON.stringify(mcpConfig),
      '--strict-mcp-config',
      '--allowedTools',
      mcpAllowed,
      '--tools',
      '',
      '--input-format',
      'stream-json',
      '--output-format',
      'stream-json',
      '--verbose',
      '--permission-mode',
      'bypassPermissions',
      '--no-session-persistence',
    ]

    // ANTHROPIC_API_KEY を明示的に空にして、OAuth (Max プラン) 認証を強制する
    const child = spawn('claude', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ANTHROPIC_API_KEY: '' },
    })

    let stdoutBuf = ''
    let stderrBuf = ''
    const state: SpawnResult = {
      finalText: '',
      totalCostUsd: 0,
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      numTurns: 0,
      toolCallCount: 0,
    }
    let isError = false
    let errorMsg = ''

    child.stdout.on('data', (chunk: Buffer) => {
      stdoutBuf += chunk.toString()
      let idx: number
      while ((idx = stdoutBuf.indexOf('\n')) >= 0) {
        const line = stdoutBuf.slice(0, idx)
        stdoutBuf = stdoutBuf.slice(idx + 1)
        if (!line.trim()) continue
        let evt: Record<string, unknown>
        try {
          evt = JSON.parse(line)
        } catch {
          continue
        }
        if (evt.type === 'assistant') {
          const asst = evt as unknown as StreamJsonAssistant
          for (const c of asst.message.content) {
            if (c.type === 'tool_use') state.toolCallCount += 1
          }
        } else if (evt.type === 'result') {
          const r = evt as unknown as StreamJsonResult
          state.finalText = r.result
          state.totalCostUsd = r.total_cost_usd
          state.numTurns = r.num_turns
          state.inputTokens = r.usage?.input_tokens ?? 0
          state.outputTokens = r.usage?.output_tokens ?? 0
          state.cacheCreationTokens = r.usage?.cache_creation_input_tokens ?? 0
          state.cacheReadTokens = r.usage?.cache_read_input_tokens ?? 0
          if (r.is_error) {
            isError = true
            errorMsg = r.result
          }
        }
      }
    })
    child.stderr.on('data', (c: Buffer) => {
      stderrBuf += c.toString()
    })

    child.on('error', reject)
    child.on('close', (code) => {
      if (code !== 0 || isError) {
        reject(
          new Error(
            `claude CLI failed (exit=${code}): ${errorMsg || stderrBuf.slice(-500) || 'unknown'}`,
          ),
        )
        return
      }
      resolve(state)
    })

    const userEvt = {
      type: 'user',
      message: { role: 'user', content: input.userMessage },
    }
    child.stdin.write(JSON.stringify(userEvt) + '\n')
    child.stdin.end()
  })
}
