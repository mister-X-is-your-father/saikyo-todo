/**
 * Phase 6.15 iter113: Workflow node 実行 registry。
 * 各 node 種別の executor を集約。Engine から `executors[type](ctx, config, input)` で呼ぶ。
 *
 * 現時点の実装:
 *   - noop: 入力をそのまま出力 (テスト / dummy)
 *   - http: 任意 URL に fetch (timeout 10s、レスポンス body / status を output)
 *
 * 次 iter で追加予定:
 *   - ai: Researcher / Engineer / カスタムプロンプト
 *   - slack: dispatcher.ts 経由
 *   - email: mock outbox
 *   - script: scripts/ 配下を invoke (whitelist)
 *   - branch / parallel: 制御フロー
 */
import 'server-only'

export interface NodeExecutionContext {
  workspaceId: string
  workflowRunId: string
  /** 現 node の id */
  nodeId: string
  /** 上流 node の output を merge した入力 (root の場合は workflow_runs.input) */
  input: unknown
}

export interface NodeExecutionResult {
  output: unknown
  log?: string
}

export type NodeExecutor = (
  ctx: NodeExecutionContext,
  config: Record<string, unknown>,
) => Promise<NodeExecutionResult>

const noopExecutor: NodeExecutor = async (ctx) => {
  return { output: ctx.input, log: 'noop: input passed through' }
}

const httpExecutor: NodeExecutor = async (_ctx, config) => {
  const url = typeof config.url === 'string' ? config.url : null
  if (!url) throw new Error('http node config.url が未指定')
  const method = typeof config.method === 'string' ? config.method.toUpperCase() : 'GET'
  const headers =
    config.headers && typeof config.headers === 'object'
      ? (config.headers as Record<string, string>)
      : {}
  const body =
    method !== 'GET' && config.body != null
      ? typeof config.body === 'string'
        ? config.body
        : JSON.stringify(config.body)
      : undefined

  // 10 秒 timeout (workflow の hangup 防止)
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 10_000)
  try {
    const res = await fetch(url, {
      method,
      headers: {
        ...(body && !headers['content-type'] ? { 'content-type': 'application/json' } : {}),
        ...headers,
      },
      body,
      signal: ctrl.signal,
    })
    let parsed: unknown = null
    const text = await res.text()
    try {
      parsed = text ? JSON.parse(text) : null
    } catch {
      parsed = text
    }
    return {
      output: { status: res.status, ok: res.ok, body: parsed },
      log: `${method} ${url} → ${res.status}`,
    }
  } finally {
    clearTimeout(timer)
  }
}

export const nodeExecutors: Record<string, NodeExecutor> = {
  noop: noopExecutor,
  http: httpExecutor,
}

/** 未実装 node 型は明示的に NotImplemented で fail させる */
export function getNodeExecutor(type: string): NodeExecutor {
  const exec = nodeExecutors[type]
  if (!exec) {
    return async () => {
      throw new Error(
        `node type "${type}" is not yet implemented (iter113 では noop / http のみ対応)`,
      )
    }
  }
  return exec
}
