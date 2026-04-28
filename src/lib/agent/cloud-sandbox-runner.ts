/**
 * Phase 6.15 iter 240 — Engineer / Researcher を e2b cloud sandbox 経由で実行する runner。
 *
 * 目的: ローカル PC (subprocess + git worktree) の不安定さ (sleep / OOM /
 * 突然 reboot) を排除し、cloud microVM で 24/7 安定実行する。フル自動 (α)
 * モードでは sandbox が完走後に直接 main に push & merge する。
 *
 * 段階実装 (FEEDBACK_QUEUE.md 参照):
 *   - iter 239: skeleton (型 + 関数 signature)
 *   - **iter 240 (本 commit): Sandbox.create + hello world 実行 + log capture** ←
 *   - iter 241: git clone + claude CLI (Max OAuth credentials を base64 で env 注入)
 *   - iter 242: pnpm typecheck / lint / test verify (custom template に DiD + supabase)
 *   - iter 243: autoMergeToMain で main 直 push (フル自動 α)
 *
 * 環境変数:
 *   - E2B_API_KEY: e2b.dev の API key (https://e2b.dev/dashboard)
 *
 * NOTE: E2B_API_KEY 未設定時は ConfigurationError を投げる。caller は
 *   CLOUD_SANDBOX_ENABLED フラグで上位 dispatch を制御する想定。
 */
import { Sandbox } from 'e2b'

import { AppError } from '@/lib/errors'

export interface CloudSandboxInput {
  /** 識別用 — agent_invocations.id 等 */
  invocationId: string
  workspaceId: string
  itemId: string
  /** Engineer / Researcher の prompt 本文 (claude CLI に渡す)。iter 241 以降で使用 */
  prompt: string
  /** 完走後 main に直接 push するか (フル自動 = true)。iter 243 で実装 */
  autoMergeToMain: boolean
  /** 1 sandbox の最大実行時間 (秒)。default 1800 (30 分) */
  timeoutSec?: number
  /**
   * 起動後に実行するシェルスクリプト (sandbox 内 bash)。
   * iter 240 ではこの引数で hello world / 任意の検証コマンドを流せる。
   * 未指定なら "echo iter240 hello from cloud sandbox" を実行。
   */
  script?: string
}

export interface CloudSandboxOutput {
  /** sandbox id (e2b 側の識別子)。debug / kill 用 */
  sandboxId: string
  /** script の exit code (0 = 成功) */
  exitCode: number
  /** stdout / stderr の先頭 / 末尾 4 KiB を保持 (Item.description などに残す) */
  logsHead: string
  logsTail: string
  /** 実行時間 (ms) — 起動 + script 実行 + kill の総合計 */
  durationMs: number
  /** sandbox 終了理由 */
  exitReason: 'completed' | 'timeout' | 'sandbox-error'
  errorMessage?: string
}

const LOG_HEAD_TAIL_BYTES = 4 * 1024

/** ConfigurationError は env 未設定など caller 側のミス。retry しても直らない。 */
class CloudSandboxConfigError extends AppError {
  constructor(message: string, cause?: unknown) {
    super('cloud-sandbox-config-error', message, cause)
  }
}

/**
 * Cloud sandbox で 1 ラウンド実行する。
 *
 * iter 240 時点では以下を行う:
 *   1. Sandbox.create で microVM を起動 (default template)
 *   2. input.script (or hello world) を bash で実行
 *   3. stdout / stderr を head/tail 形式で集約
 *   4. sandbox.kill() でリソース解放
 *
 * iter 241 以降で git clone / claude CLI / verify / merge を上に積む。
 */
export async function runViaCloudSandbox(input: CloudSandboxInput): Promise<CloudSandboxOutput> {
  const apiKey = process.env.E2B_API_KEY
  if (!apiKey) {
    throw new CloudSandboxConfigError(
      'E2B_API_KEY env が未設定です。https://e2b.dev/dashboard で取得して .env.local に追加してください。',
    )
  }
  const timeoutSec = input.timeoutSec ?? 1800
  const script =
    input.script ?? `echo "iter240 hello from cloud sandbox (invocation=${input.invocationId})"`
  const startedAt = Date.now()

  let sandbox: Sandbox | null = null
  try {
    sandbox = await Sandbox.create({
      apiKey,
      timeoutMs: timeoutSec * 1000,
      envs: {
        SAIKYO_INVOCATION_ID: input.invocationId,
        SAIKYO_WORKSPACE_ID: input.workspaceId,
        SAIKYO_ITEM_ID: input.itemId,
      },
    })
    const sandboxId = sandbox.sandboxId
    const result = await sandbox.commands.run(script, { timeoutMs: timeoutSec * 1000 })
    const stdout = result.stdout ?? ''
    const stderr = result.stderr ?? ''
    const combined = stdout + (stderr ? `\n--- STDERR ---\n${stderr}` : '')
    return {
      sandboxId,
      exitCode: result.exitCode ?? 0,
      logsHead: combined.slice(0, LOG_HEAD_TAIL_BYTES),
      logsTail:
        combined.length > LOG_HEAD_TAIL_BYTES * 2 ? combined.slice(-LOG_HEAD_TAIL_BYTES) : '',
      durationMs: Date.now() - startedAt,
      exitReason: 'completed',
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      sandboxId: sandbox?.sandboxId ?? '',
      exitCode: -1,
      logsHead: '',
      logsTail: '',
      durationMs: Date.now() - startedAt,
      exitReason: message.toLowerCase().includes('timeout') ? 'timeout' : 'sandbox-error',
      errorMessage: message,
    }
  } finally {
    if (sandbox) {
      try {
        await sandbox.kill()
      } catch {
        // sandbox 既に死んでいる場合は無視
      }
    }
  }
}

export { CloudSandboxConfigError }
