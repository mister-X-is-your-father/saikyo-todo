/**
 * Phase 6.15 iter 239 — Engineer / Researcher を e2b cloud sandbox 経由で実行する runner skeleton。
 *
 * 目的: ローカル PC (subprocess + git worktree) の不安定さ (sleep / OOM /
 * 突然 reboot) を排除し、cloud microVM で 24/7 安定実行する。フル自動 (α)
 * モードでは sandbox が完走後に直接 main に push & merge する。
 *
 * 実行フロー (full vision、本 file は skeleton):
 *   1. Sandbox.create({ template: 'saikyo-engineer' }) で microVM 起動
 *      (template には docker / supabase CLI / playwright / claude CLI 同梱)
 *   2. ENV 注入: GITHUB_TOKEN, CLAUDE_CREDENTIALS_B64 (~/.claude/.credentials.json
 *      の base64), workspaceId, itemId, prompt
 *   3. sandbox.commands.run('git clone … && cd repo && pnpm install')
 *   4. sandbox.commands.run('claude … <prompt>') — agent 本実行
 *   5. sandbox.commands.run('pnpm typecheck && pnpm lint && pnpm test')
 *      失敗時は revert
 *   6. (autoMerge=true) sandbox.commands.run('git push origin main')
 *      または PR draft 作成
 *   7. agent_invocations にステータス書き込み、sandbox.kill()
 *
 * 現段階 (iter 239): SDK 初期化と関数 signature のみ。実際の sandbox 起動・
 * 認証・docker template は次 iter 以降で段階追加。
 *
 * 関連 issue: FEEDBACK_QUEUE.md の「Claude on Web (リモートサンドボックス)」項。
 */

export interface CloudSandboxInput {
  /** 識別用 — agent_invocations.id 等 */
  invocationId: string
  workspaceId: string
  itemId: string
  /** Engineer / Researcher の prompt 本文 (claude CLI に渡す) */
  prompt: string
  /** 完走後 main に直接 push するか (フル自動 = true)。false なら Draft PR 作成 */
  autoMergeToMain: boolean
  /** 1 sandbox の最大実行時間 (秒)。default 1800 (30 分) */
  timeoutSec?: number
}

export interface CloudSandboxOutput {
  /** sandbox から得た最終 commit SHA */
  commitSha?: string
  /** push 成功したか (autoMergeToMain=true 時) */
  pushed: boolean
  /** 各 verify step の合否 (typecheck / lint / test) */
  verify: {
    typecheck: boolean
    lint: boolean
    test: boolean
    e2e?: boolean
  }
  /** sandbox 内の stdout / stderr ダイジェスト (先頭 / 末尾各 4 KiB) */
  logsHead: string
  logsTail: string
  /** sandbox 終了理由 */
  exitReason: 'completed' | 'timeout' | 'verify-failed' | 'sandbox-error'
  /** 失敗時のエラー文 (取得できれば) */
  errorMessage?: string
}

/**
 * **WIP**: e2b SDK の `Sandbox` を使って実行する。
 *
 * 現状: 未実装。SDK は `pnpm add e2b` 済 (iter 239)。次 iter 以降で:
 *   - E2B_API_KEY を env から読む
 *   - `Sandbox.create({ template, envs })`
 *   - commands.run の結果を集約
 *   - timeout / kill / log capture
 *   - agent_invocations へ書き戻し (この関数の caller 側責務)
 */
export async function runViaCloudSandbox(input: CloudSandboxInput): Promise<CloudSandboxOutput> {
  // Phase 6.15 iter 239 placeholder.
  // 実装は段階的: iter 240 で Sandbox.create + hello world、iter 241 で git clone
  // + claude CLI 配線、iter 242 で verify steps、iter 243 で push/merge。
  throw new Error(
    `cloud-sandbox-runner.runViaCloudSandbox is not implemented yet (iter 239 skeleton, ` +
      `received invocationId=${input.invocationId}). See FEEDBACK_QUEUE.md for the full plan.`,
  )
}
