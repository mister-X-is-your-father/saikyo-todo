/**
 * Engineer Agent service (Phase 6.12)。
 *
 * 流れ:
 *   1. Item を読み、必要情報 (title, description, dod) を集約
 *   2. 予算チェック (cost-budget)
 *   3. agent_invocations を queued → running
 *   4. git worktree を新ディレクトリに作成 (隔離)
 *   5. claude CLI を subprocess 起動 (Max プラン OAuth、ANTHROPIC_API_KEY 不要)
 *      - --add-dir <worktree> / --permission-mode acceptEdits
 *      - system prompt = ENGINEER_SYSTEM_PROMPT
 *      - user message = Item の概要 + 完了条件
 *   6. CLI 完了後、worktree で git status / git diff を取得
 *   7. diff が非空なら commit + push + `gh pr create --draft` を実行 (autoPr=true 時)
 *   8. agent_invocations を completed (output に prUrl / diffStat / files)
 *   9. worktree を git worktree remove で掃除
 *
 * テスト:
 *   - `runner` を DI 可能 (テストで claude CLI / git をモック)
 */
import 'server-only'

import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

import { recordAudit } from '@/lib/audit'
import { adminDb } from '@/lib/db/scoped-client'
import { ExternalServiceError, NotFoundError, ValidationError } from '@/lib/errors'
import { err, ok, type Result } from '@/lib/result'

import { itemRepository } from '@/features/item/repository'

import { ENGINEER_ROLE } from './roles/engineer'
import { checkBudget } from './cost-budget'
import { agentInvocationRepository } from './repository'
import { agentService } from './service'

const execFileP = promisify(execFile)

export interface EngineerRunInput {
  workspaceId: string
  itemId: string
  /**
   * worktree のソースとなる git リポジトリ root の絶対パス。
   * 通常は Next.js の cwd (=リポジトリ root) を渡す。
   */
  repoRoot: string
  /** worktree を生やすベースブランチ。既定 'main' */
  baseBranch?: string
  /** 自動 PR 起票するか。false なら commit + diff 集計のみ。既定 false */
  autoPr?: boolean
  idempotencyKey: string
  /**
   * テスト DI。worktree 内で 1 回呼ばれて、コードを書き換えた前提で結果を返す。
   * 省略時は claude CLI を spawn する実装が走る。
   */
  runner?: EngineerRunner
}

export interface EngineerRunnerInput {
  worktreeDir: string
  systemPrompt: string
  userMessage: string
  model: string
}

export interface EngineerRunnerOutput {
  finalText: string
  numTurns: number
  toolCallCount: number
  totalCostUsd: number
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
}

export type EngineerRunner = (input: EngineerRunnerInput) => Promise<EngineerRunnerOutput>

export interface EngineerRunOutput {
  invocationId: string
  agentId: string
  /** PR を作った場合 (autoPr=true 成功時) */
  prUrl: string | null
  /** local commit が作られた場合の SHA */
  commitSha: string | null
  /** 変更ファイル一覧 (worktree 内 git status の relative path) */
  changedFiles: string[]
  /** git diff --shortstat の出力 */
  diffShortStat: string
  /** Engineer の最終応答テキスト */
  text: string
  costUsd: number
}

export const engineerService = {
  async runForItem(input: EngineerRunInput): Promise<Result<EngineerRunOutput>> {
    if (!input.workspaceId || !input.itemId) {
      return err(new ValidationError('workspaceId / itemId 必須'))
    }
    if (!input.repoRoot) {
      return err(new ValidationError('repoRoot 必須'))
    }
    if (!input.idempotencyKey) {
      return err(new ValidationError('idempotencyKey 必須'))
    }
    const baseBranch = input.baseBranch ?? 'main'

    // 予算チェック (runner DI されてない本番経路のみ)
    if (!input.runner) {
      const budget = await checkBudget(input.workspaceId)
      if (!budget.ok) return err(budget.error)
    }

    // Item 取得 (adminDb で workspace 越境チェックは itemId 直引き + ws 一致確認)
    const item = await adminDb.transaction(async (tx) => itemRepository.findById(tx, input.itemId))
    if (!item) return err(new NotFoundError('Item が見つかりません'))
    if (item.workspaceId !== input.workspaceId) {
      return err(new ValidationError('Item は別 workspace のものです'))
    }

    const agent = await agentService.ensureAgent(input.workspaceId, 'engineer')

    const invocation = await adminDb.transaction((tx) =>
      agentInvocationRepository.insert(tx, {
        agentId: agent.id,
        workspaceId: input.workspaceId,
        targetItemId: input.itemId,
        status: 'queued',
        input: {
          userMessage: buildUserMessage(item.title, item.description, item.dod),
          role: 'engineer',
          itemId: input.itemId,
          baseBranch,
          autoPr: !!input.autoPr,
          via: 'engineer-cli',
        } as never,
        model: ENGINEER_ROLE.model,
        idempotencyKey: input.idempotencyKey,
      }),
    )
    await adminDb.transaction((tx) =>
      agentInvocationRepository.update(tx, invocation.id, {
        status: 'running',
        startedAt: new Date(),
      }),
    )

    let worktreeDir: string | null = null
    let branchName = ''
    try {
      // worktree dir を /tmp 配下に確保し、新ブランチを生やす
      worktreeDir = await mkdtemp(join(tmpdir(), 'saikyo-engineer-'))
      branchName = `engineer/${input.itemId.slice(0, 8)}-${slugify(item.title)}`.slice(0, 80)
      await git(input.repoRoot, ['worktree', 'add', '-b', branchName, worktreeDir, baseBranch])

      // 実行 (DI runner があればテスト経路、なければ claude CLI を spawn)
      const runner = input.runner ?? defaultClaudeRunner
      const userMessage = buildUserMessage(item.title, item.description, item.dod)
      const ran = await runner({
        worktreeDir,
        systemPrompt: ENGINEER_ROLE.systemPrompt,
        userMessage,
        model: ENGINEER_ROLE.model,
      })

      // diff / changed files を集計
      const { stdout: status } = await git(worktreeDir, ['status', '--porcelain'])
      // git status --porcelain は "<XY> <path>" 形式 (常に X/Y + space + path)。
      // 行頭を trim してはいけない (status コードを潰す) — 4 文字目以降が path。
      const changedFiles = status
        .split('\n')
        .filter((l) => l.length > 3)
        .map((l) => l.slice(3).trim())
      const { stdout: shortstatRaw } = await git(worktreeDir, [
        'diff',
        '--shortstat',
        'HEAD',
      ]).catch(() => ({ stdout: '' }))
      const diffShortStat = shortstatRaw.trim()

      let commitSha: string | null = null
      let prUrl: string | null = null
      if (changedFiles.length > 0) {
        await git(worktreeDir, ['add', '-A'])
        const commitMsg = `[engineer] ${item.title.slice(0, 60)}\n\nrefs: item ${input.itemId.slice(0, 8)}`
        await git(worktreeDir, [
          '-c',
          `user.email=engineer-agent@saikyo-todo.local`,
          '-c',
          `user.name=Engineer Agent`,
          'commit',
          '-m',
          commitMsg,
        ])
        const { stdout: sha } = await git(worktreeDir, ['rev-parse', 'HEAD'])
        commitSha = sha.trim()

        if (input.autoPr) {
          // push + gh pr create. 認証はホスト側 gh が持っている前提。
          await git(worktreeDir, ['push', '-u', 'origin', branchName])
          const prBody = buildPrBody(item.title, item.description, item.dod, ran.finalText)
          try {
            const ghOut = await execFileP(
              'gh',
              [
                'pr',
                'create',
                '--draft',
                '--base',
                baseBranch,
                '--title',
                `[engineer] ${item.title.slice(0, 80)}`,
                '--body',
                prBody,
              ],
              { cwd: worktreeDir },
            )
            const m = ghOut.stdout.match(/https?:\/\/\S+/)
            prUrl = m ? m[0] : null
          } catch (e) {
            // gh pr create 失敗時、push 済みの remote branch を掃除して orphan を残さない。
            // 失敗自体は ExternalServiceError として上に伝搬。
            await git(worktreeDir, ['push', 'origin', '--delete', branchName]).catch(() => {})
            throw new ExternalServiceError('gh pr create', e)
          }
        }
      }

      const costStr = ran.totalCostUsd.toFixed(6)
      await adminDb.transaction(async (tx) => {
        await agentInvocationRepository.update(tx, invocation.id, {
          status: 'completed',
          output: {
            text: ran.finalText,
            numTurns: ran.numTurns,
            toolCallCount: ran.toolCallCount,
            changedFiles,
            diffShortStat,
            commitSha,
            prUrl,
            branchName,
            via: 'engineer-cli',
          } as never,
          inputTokens: ran.inputTokens,
          outputTokens: ran.outputTokens,
          cacheCreationTokens: ran.cacheCreationTokens,
          cacheReadTokens: ran.cacheReadTokens,
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
            changedFileCount: changedFiles.length,
            commitSha,
            prUrl,
            via: 'engineer-cli',
          },
        })
      })

      return ok({
        invocationId: invocation.id,
        agentId: agent.id,
        prUrl,
        commitSha,
        changedFiles,
        diffShortStat,
        text: ran.finalText,
        costUsd: ran.totalCostUsd,
      })
    } catch (e) {
      const errorMessage = (e instanceof Error ? e.message : String(e)).slice(0, 2000)
      await adminDb
        .transaction(async (tx) => {
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
            after: { status: 'failed', errorMessage, via: 'engineer-cli' },
          })
        })
        .catch(() => {})
      return err(new ExternalServiceError('engineer-agent', e))
    } finally {
      // worktree 掃除 (失敗時も)
      if (worktreeDir) {
        await git(input.repoRoot, ['worktree', 'remove', '--force', worktreeDir]).catch(() => {})
        await rm(worktreeDir, { recursive: true, force: true }).catch(() => {})
        if (branchName) {
          await git(input.repoRoot, ['branch', '-D', branchName]).catch(() => {})
        }
      }
    }
  },
}

function slugify(s: string): string {
  return (
    s
      .normalize('NFKD')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase()
      .slice(0, 30) || 'task'
  )
}

export function buildUserMessage(title: string, description: string, dod: string | null): string {
  return [
    `## タスク`,
    `**${title}**`,
    '',
    description ? `### 詳細\n${description}` : '',
    dod ? `### 完了条件 (DoD)\n${dod}` : '',
    '',
    'このタスクを実装してください。worktree 内で自由にファイルを read / edit してよいです。',
    '完成したら 5-10 行で「何を変えたか」「動作確認した内容」「人間レビュー必要箇所」を返してください。',
  ]
    .filter((l) => l !== '')
    .join('\n')
}

function buildPrBody(
  title: string,
  description: string,
  dod: string | null,
  agentSummary: string,
): string {
  return [
    `## Item`,
    `**${title}**`,
    '',
    description ? `### 詳細\n${description}` : '',
    dod ? `### 完了条件 (DoD)\n${dod}` : '',
    '',
    `## Engineer Agent サマリ`,
    agentSummary || '(出力なし)',
    '',
    `---`,
    `🤖 Generated by Engineer Agent (saikyo-todo Phase 6.12)`,
  ]
    .filter((l) => l !== '')
    .join('\n')
}

async function git(cwd: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return await execFileP('git', args, { cwd, maxBuffer: 50 * 1024 * 1024 })
}

const defaultClaudeRunner: EngineerRunner = async (input) => {
  // 既存の claude CLI subprocess 経路は scripts/claude-flow-runner.ts と同様だが、
  // MCP 不要 (worktree の Read/Edit/Bash 標準ツールで完結) + cwd を worktree にする。
  const { spawn } = await import('node:child_process')
  return await new Promise<EngineerRunnerOutput>((resolve, reject) => {
    const args = [
      '-p',
      '--model',
      input.model,
      '--system-prompt',
      input.systemPrompt,
      '--input-format',
      'stream-json',
      '--output-format',
      'stream-json',
      '--verbose',
      '--permission-mode',
      'acceptEdits',
      '--no-session-persistence',
      '--add-dir',
      input.worktreeDir,
    ]
    const child = spawn('claude', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: input.worktreeDir,
      env: { ...process.env, ANTHROPIC_API_KEY: '' },
    })
    let stdoutBuf = ''
    let stderrBuf = ''
    const state: EngineerRunnerOutput = {
      finalText: '',
      numTurns: 0,
      toolCallCount: 0,
      totalCostUsd: 0,
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
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
          const content = (evt as { message?: { content?: Array<{ type: string }> } }).message
            ?.content
          if (content) {
            for (const c of content) {
              if (c.type === 'tool_use') state.toolCallCount += 1
            }
          }
        } else if (evt.type === 'result') {
          const r = evt as {
            result?: string
            total_cost_usd?: number
            num_turns?: number
            is_error?: boolean
            usage?: {
              input_tokens?: number
              output_tokens?: number
              cache_creation_input_tokens?: number
              cache_read_input_tokens?: number
            }
          }
          state.finalText = r.result ?? ''
          state.totalCostUsd = r.total_cost_usd ?? 0
          state.numTurns = r.num_turns ?? 0
          state.inputTokens = r.usage?.input_tokens ?? 0
          state.outputTokens = r.usage?.output_tokens ?? 0
          state.cacheCreationTokens = r.usage?.cache_creation_input_tokens ?? 0
          state.cacheReadTokens = r.usage?.cache_read_input_tokens ?? 0
          if (r.is_error) {
            isError = true
            errorMsg = r.result ?? ''
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
    const userEvt = { type: 'user', message: { role: 'user', content: input.userMessage } }
    child.stdin.write(JSON.stringify(userEvt) + '\n')
    child.stdin.end()
  })
}
