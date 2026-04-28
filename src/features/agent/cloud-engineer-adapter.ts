/**
 * Phase 6.15 iter 244 — Engineer service と cloud-sandbox-runner の橋渡し adapter。
 *
 * 役割: engineer-service の `runForItem` を cloud sandbox 経由で実行したい時、
 * 既存 service のシグネチャ (item title / dod / baseBranch / autoPr) と
 * cloud-sandbox-runner の `runClaudeOnRepo` のシグネチャ (gitRepoUrl /
 * githubToken / claudeCredentialsB64 / prompt / autoMergeToMain) を変換する。
 *
 * 設計判断:
 *   - 既存 engineer-service.ts は local git worktree path に深く依存しており、
 *     break せずに置換するのは非現実的。新 adapter を service と並走させる。
 *   - dispatcher (engineer-worker.ts) で env flag `SAIKYO_ENGINEER_USE_CLOUD_SANDBOX`
 *     を見て、true なら本 adapter、false なら従来 path を呼ぶ (次 iter で配線)。
 *   - 認証情報は `loadEnvForCloudEngineer()` で集約。読めない場合は明確な
 *     ConfigError で fail-fast (silent fallback はしない)。
 *
 * 残: dispatcher 配線 (next iter)、custom e2b template、E2B_API_KEY 取得 etc.
 *   詳細は FEEDBACK_QUEUE.md。
 */
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

import { runClaudeOnRepo } from '@/lib/agent/cloud-sandbox-runner'
import { AppError } from '@/lib/errors'

class CloudEngineerEnvError extends AppError {
  constructor(message: string, cause?: unknown) {
    super('cloud-engineer-env-error', message, cause)
  }
}

export interface CloudEngineerEnv {
  /** リモートリポジトリ URL (https://github.com/<owner>/<repo>.git) */
  gitRepoUrl: string
  /** main 等 push 先 ref */
  gitRef: string
  /** push 用 GitHub token (gh PAT or installation token) */
  githubToken: string
  /** ~/.claude/.credentials.json を base64 化したもの (Max OAuth セッション) */
  claudeCredentialsB64: string
  /** commit author */
  gitAuthorName: string
  gitAuthorEmail: string
}

/**
 * env / filesystem から cloud sandbox 実行に必要な値を集める。env 名は
 * `.env.local` で設定する想定:
 *   SAIKYO_ENGINEER_GIT_REPO_URL=https://github.com/owner/repo.git
 *   SAIKYO_ENGINEER_GIT_REF=main
 *   SAIKYO_ENGINEER_GITHUB_TOKEN=ghp_xxxxxx
 *   SAIKYO_ENGINEER_GIT_AUTHOR_NAME=Engineer Bot
 *   [email protected]
 *   (CLAUDE_CREDENTIALS_PATH は default ~/.claude/.credentials.json)
 *
 * 1 つでも欠ければ `CloudEngineerEnvError` を throw。
 */
export async function loadEnvForCloudEngineer(): Promise<CloudEngineerEnv> {
  const gitRepoUrl = process.env.SAIKYO_ENGINEER_GIT_REPO_URL
  const githubToken = process.env.SAIKYO_ENGINEER_GITHUB_TOKEN
  const gitRef = process.env.SAIKYO_ENGINEER_GIT_REF ?? 'main'
  const gitAuthorName = process.env.SAIKYO_ENGINEER_GIT_AUTHOR_NAME ?? 'Saikyo Engineer Bot'
  const gitAuthorEmail =
    process.env.SAIKYO_ENGINEER_GIT_AUTHOR_EMAIL ?? 'engineer@saikyo-todo.local'
  const credPath =
    process.env.CLAUDE_CREDENTIALS_PATH ?? join(homedir(), '.claude', '.credentials.json')

  const missing: string[] = []
  if (!gitRepoUrl) missing.push('SAIKYO_ENGINEER_GIT_REPO_URL')
  if (!githubToken) missing.push('SAIKYO_ENGINEER_GITHUB_TOKEN')
  if (missing.length > 0) {
    throw new CloudEngineerEnvError(
      `Cloud Engineer 経路に必要な env が未設定: ${missing.join(', ')}`,
    )
  }

  let claudeCredentialsB64: string
  try {
    const raw = await readFile(credPath, 'utf8')
    claudeCredentialsB64 = Buffer.from(raw, 'utf8').toString('base64')
  } catch (e) {
    throw new CloudEngineerEnvError(
      `Claude credentials を読めません (path=${credPath})。Claude Max OAuth で claude CLI に login してください。`,
      e,
    )
  }

  return {
    gitRepoUrl: gitRepoUrl!,
    gitRef,
    githubToken: githubToken!,
    claudeCredentialsB64,
    gitAuthorName,
    gitAuthorEmail,
  }
}

export interface CloudEngineerInput {
  invocationId: string
  workspaceId: string
  itemId: string
  /** Engineer に投げる prompt (item title + dod + 追加文脈を service 側で組み立てて渡す) */
  prompt: string
  /** verify モード: 'fast' (default) は typecheck+lint、'full' は + vitest */
  verify?: 'none' | 'fast' | 'full'
  /** main に直接 push するか。default true (フル自動 α) */
  autoMergeToMain?: boolean
  /** commit message。Engineer が item title 等から組み立てて渡す想定 */
  commitMessage?: string
  /** sandbox 実行最大時間 (秒)。default 1800 */
  timeoutSec?: number
}

/**
 * Cloud sandbox で Engineer を 1 件実行する。`runClaudeOnRepo` 直叩きより
 * 上位に env 解決 + デフォルト適用を集約することで、呼出側 (engineer-service)
 * が薄く保てる。
 */
export async function runEngineerInCloudSandbox(input: CloudEngineerInput) {
  const env = await loadEnvForCloudEngineer()
  return runClaudeOnRepo({
    invocationId: input.invocationId,
    workspaceId: input.workspaceId,
    itemId: input.itemId,
    gitRepoUrl: env.gitRepoUrl,
    gitRef: env.gitRef,
    githubToken: env.githubToken,
    prompt: input.prompt,
    claudeCredentialsB64: env.claudeCredentialsB64,
    timeoutSec: input.timeoutSec ?? 1800,
    verify: input.verify ?? 'fast',
    autoMergeToMain: input.autoMergeToMain ?? true,
    commitMessage:
      input.commitMessage ??
      `engineer: auto-commit from cloud sandbox (item=${input.itemId.slice(0, 8)})`,
    gitAuthorName: env.gitAuthorName,
    gitAuthorEmail: env.gitAuthorEmail,
  })
}

export { CloudEngineerEnvError }

/**
 * Engineer worker からのディスパッチ判定 (pure)。env 1 個を見るだけだが
 * テスト容易化と意図明示のため関数化。
 *
 * `SAIKYO_ENGINEER_USE_CLOUD_SANDBOX=true` で 'cloud'、それ以外は 'local'。
 * 'true' のみ受ける (誤入力 'TRUE' / '1' は明示的に拒否) — 本番事故 (思わず
 * cloud 経路で動く) を防ぐため厳格 match。
 */
export function chooseEngineerRunner(
  env: Record<string, string | undefined> = process.env,
): 'cloud' | 'local' {
  return env.SAIKYO_ENGINEER_USE_CLOUD_SANDBOX === 'true' ? 'cloud' : 'local'
}
