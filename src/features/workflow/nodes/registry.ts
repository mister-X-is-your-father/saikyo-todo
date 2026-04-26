/**
 * Phase 6.15 iter113-114: Workflow node 実行 registry。
 * 各 node 種別の executor を集約。Engine から `executors[type](ctx, config, input)` で呼ぶ。
 *
 * 実装済:
 *   - noop: 入力をそのまま出力 (テスト / dummy)
 *   - http: 任意 URL に fetch (timeout 10s、レスポンス body / status を output)
 *   - slack: dispatchSlack (best-effort 通知)
 *   - email: dispatchEmail (mock_email_outbox に write、本番は Resend へ差し替え)
 *
 * 次 iter で追加予定:
 *   - ai: Researcher / Engineer / カスタムプロンプト
 *   - script: scripts/ 配下を invoke (whitelist)
 *   - branch / parallel: 制御フロー
 */
import 'server-only'

import { dispatchEmail } from '@/features/email/dispatcher'
import { dispatchSlack } from '@/features/slack/dispatcher'

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

/**
 * slack node: workspace の Slack webhook へ通知。
 * config: { text: string, channel?: string, linkUrl?: string, linkLabel?: string }
 * 上流 input が text を持っていれば優先的にそれを使う (template 風)。
 */
const slackExecutor: NodeExecutor = async (ctx, config) => {
  const text =
    typeof config.text === 'string'
      ? config.text
      : ctx.input && typeof ctx.input === 'object' && 'text' in (ctx.input as object)
        ? String((ctx.input as { text: unknown }).text)
        : null
  if (!text) throw new Error('slack node: text が config / input に無い')
  const channel = typeof config.channel === 'string' ? config.channel : undefined
  const linkUrl = typeof config.linkUrl === 'string' ? config.linkUrl : undefined
  const linkLabel = typeof config.linkLabel === 'string' ? config.linkLabel : undefined
  const r = await dispatchSlack({
    workspaceId: ctx.workspaceId,
    type: 'workflow',
    text,
    ...(channel ? { channel } : {}),
    ...(linkUrl ? { linkUrl } : {}),
    ...(linkLabel ? { linkLabel } : {}),
  })
  return {
    output: { delivered: r.delivered, channel: channel ?? null },
    log: `slack: delivered=${r.delivered}`,
  }
}

/**
 * email node: dispatchEmail で mock outbox に write (実 SMTP 移行で透過的に切替)。
 * config: { toEmail, subject, html?, text?, userId?, workspaceId? }
 * subject / text / html は必須相当 (text 無ければ html を strip し fallback)。
 */
const emailExecutor: NodeExecutor = async (ctx, config) => {
  const toEmail = typeof config.toEmail === 'string' ? config.toEmail : null
  const subject = typeof config.subject === 'string' ? config.subject : null
  if (!toEmail) throw new Error('email node: toEmail が未指定')
  if (!subject) throw new Error('email node: subject が未指定')
  const text =
    typeof config.text === 'string'
      ? config.text
      : typeof config.html === 'string'
        ? (config.html as string).replace(/<[^>]+>/g, '')
        : ''
  const html = typeof config.html === 'string' ? config.html : `<p>${escapeHtml(text)}</p>`
  const userId = typeof config.userId === 'string' ? config.userId : null
  const r = await dispatchEmail({
    workspaceId: ctx.workspaceId,
    userId,
    toEmail,
    type: 'workflow',
    subject,
    html,
    text,
  })
  return {
    output: { id: r.id, toEmail },
    log: `email: outbox=${r.id} to=${toEmail}`,
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export const nodeExecutors: Record<string, NodeExecutor> = {
  noop: noopExecutor,
  http: httpExecutor,
  slack: slackExecutor,
  email: emailExecutor,
}

/** 未実装 node 型は明示的に NotImplemented で fail させる */
export function getNodeExecutor(type: string): NodeExecutor {
  const exec = nodeExecutors[type]
  if (!exec) {
    return async () => {
      throw new Error(
        `node type "${type}" is not yet implemented (iter114 までは noop / http / slack / email)`,
      )
    }
  }
  return exec
}
