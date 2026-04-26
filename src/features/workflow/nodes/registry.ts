/**
 * Phase 6.15 iter113-116: Workflow node 実行 registry。
 * 各 node 種別の executor を集約。Engine から `executors[type](ctx, config, input)` で呼ぶ。
 *
 * 実装済:
 *   - noop: 入力をそのまま出力 (テスト / dummy)
 *   - http: 任意 URL に fetch (timeout 10s、レスポンス body / status を output)
 *   - slack: dispatchSlack (best-effort 通知)
 *   - email: dispatchEmail (mock_email_outbox に write、本番は Resend へ差し替え)
 *   - ai: Researcher Agent をカスタムプロンプトで起動 (Claude Max OAuth + claude CLI)
 *   - script: scripts/ 配下の whitelist された .ts ファイルを `pnpm tsx` で実行 (timeout 60s)
 *
 * 次 iter で追加予定:
 *   - branch / parallel: 制御フロー
 */
import 'server-only'

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'

import { researcherService } from '@/features/agent/researcher-service'
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

/**
 * ai node: Researcher Agent を任意プロンプトで起動。
 * config:
 *   { prompt: string, role?: 'researcher', targetItemId?: string }
 *   prompt は user message として渡す。input が object なら JSON で末尾に append。
 * output: { text, invocationId, costUsd, iterations, toolCalls }
 *
 * Claude Max OAuth + claude CLI 前提 (ANTHROPIC_API_KEY は使わない)。
 * テスト環境で Claude CLI が無いと fail するので、CI / unit test では
 * 実 LLM 呼び出しを伴うテストは別途 (e2e / verify-phase 系) に任せる。
 */
const aiExecutor: NodeExecutor = async (ctx, config) => {
  const promptCfg = typeof config.prompt === 'string' ? config.prompt : ''
  if (!promptCfg) throw new Error('ai node: config.prompt が未指定')
  const targetItemId = typeof config.targetItemId === 'string' ? config.targetItemId : undefined

  // 上流 input が非 null なら JSON 化して prompt に append (context 注入)
  const ctxStr =
    ctx.input == null
      ? ''
      : `\n\n--- 上流 node から受け取った context ---\n${JSON.stringify(ctx.input, null, 2)}`
  const userMessage = `${promptCfg}${ctxStr}`

  // workflow_run と紐付ける idempotencyKey (同一 run で同 node なら重複起動しない)
  const idempotencyKey = `wf-${ctx.workflowRunId}-${ctx.nodeId}`

  const r = await researcherService.run({
    workspaceId: ctx.workspaceId,
    userMessage,
    idempotencyKey,
    ...(targetItemId ? { targetItemId } : {}),
  })
  if (!r.ok) throw r.error
  return {
    output: {
      text: r.value.text,
      invocationId: r.value.invocationId,
      costUsd: r.value.costUsd,
      iterations: r.value.iterations,
      toolCalls: r.value.toolCalls.length,
    },
    log: `ai: ${r.value.iterations} iter, $${r.value.costUsd.toFixed(4)}, tools=${r.value.toolCalls.length}`,
  }
}

/**
 * script node: scripts/ 配下の .ts を `pnpm tsx --env-file=.env.local` で実行。
 * セキュリティ:
 *   - 名前のホワイトリスト: 英数 / `_` / `-` / `.` のみ、`.ts` 終端
 *   - パスエスケープ防止 (`..` / `/` / `\` は名前には含めない)
 *   - 既存ファイル必須 (実体が無ければ即 fail)
 *   - args は string 配列のみ (shell expansion させない、shell: false で spawn)
 *   - timeout 60s — Playwright 系を想定 (workflow が hang しないよう短めに)
 *   - stdout / stderr は workflow_node_runs.log へ
 *
 * Playwright を呼ぶ場合は `scripts/explore-uiux-*.ts` のような script を置いておけば呼べる。
 */
const SCRIPT_NAME_RE = /^[a-zA-Z0-9._-]+\.ts$/
const SCRIPT_TIMEOUT_MS = 60_000
const PROJECT_ROOT = process.cwd()

const scriptExecutor: NodeExecutor = async (_ctx, config) => {
  const name = typeof config.name === 'string' ? config.name : null
  if (!name) throw new Error('script node: config.name が未指定')
  if (!SCRIPT_NAME_RE.test(name)) {
    throw new Error(`script node: name "${name}" は不正 (英数 / _ / - / . と .ts 終端のみ許可)`)
  }
  if (name.includes('..')) {
    throw new Error('script node: パスエスケープ "..": 不許可')
  }
  const args =
    Array.isArray(config.args) && config.args.every((a) => typeof a === 'string')
      ? (config.args as string[])
      : []

  const scriptPath = path.join(PROJECT_ROOT, 'scripts', name)
  if (!existsSync(scriptPath)) {
    throw new Error(`script node: scripts/${name} が見つかりません`)
  }

  // pnpm tsx --env-file=.env.local scripts/<name> [...args]
  // shell: false で arg 配列を直接渡す (shell expansion / injection 防止)
  return await new Promise((resolve, reject) => {
    const child = spawn('pnpm', ['tsx', '--env-file=.env.local', `scripts/${name}`, ...args], {
      cwd: PROJECT_ROOT,
      env: process.env,
      shell: false,
    })
    let stdout = ''
    let stderr = ''
    let killed = false
    const t = setTimeout(() => {
      killed = true
      child.kill('SIGKILL')
    }, SCRIPT_TIMEOUT_MS)
    child.stdout?.on('data', (b) => {
      stdout += b.toString()
      if (stdout.length > 1_000_000) stdout = stdout.slice(-500_000) // 過大 stdout 切詰
    })
    child.stderr?.on('data', (b) => {
      stderr += b.toString()
      if (stderr.length > 1_000_000) stderr = stderr.slice(-500_000)
    })
    child.on('error', (e) => {
      clearTimeout(t)
      reject(new Error(`script node spawn failed: ${e.message}`))
    })
    child.on('close', (code) => {
      clearTimeout(t)
      if (killed) {
        reject(new Error(`script node timeout (${SCRIPT_TIMEOUT_MS}ms) — SIGKILL`))
        return
      }
      if (code !== 0) {
        reject(
          new Error(`script ${name} exited ${code}\n--- stderr (tail) ---\n${stderr.slice(-2000)}`),
        )
        return
      }
      // stdout の最後を JSON parse できれば output、ダメなら text のまま
      let parsed: unknown = stdout
      const trimmed = stdout.trim()
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          parsed = JSON.parse(trimmed)
        } catch {
          // ignore
        }
      }
      resolve({
        output: parsed,
        log:
          `script ${name} exit=0 stdout=${stdout.length}B stderr=${stderr.length}B\n` +
          (stdout.length > 0 ? `--- stdout (tail) ---\n${stdout.slice(-2000)}` : ''),
      })
    })
  })
}

export const nodeExecutors: Record<string, NodeExecutor> = {
  noop: noopExecutor,
  http: httpExecutor,
  slack: slackExecutor,
  email: emailExecutor,
  ai: aiExecutor,
  script: scriptExecutor,
}

/** 未実装 node 型は明示的に NotImplemented で fail させる */
export function getNodeExecutor(type: string): NodeExecutor {
  const exec = nodeExecutors[type]
  if (!exec) {
    return async () => {
      throw new Error(
        `node type "${type}" is not yet implemented (iter116 までは noop / http / slack / email / ai / script)`,
      )
    }
  }
  return exec
}
