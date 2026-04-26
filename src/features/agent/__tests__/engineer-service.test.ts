/**
 * engineerService integration test。
 * 実 Supabase + 一時 git repo を作って worktree フローを通す。claude CLI は DI runner で mock。
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { adminClient, createTestUserAndWorkspace, mockAuthGuards } from '@/test/fixtures'

vi.mock('@/lib/auth/guard', () => ({
  requireUser: vi.fn(),
  requireWorkspaceMember: vi.fn(),
  hasAtLeast: () => true,
}))

import {
  type EngineerRunner,
  type EngineerRunnerOutput,
  engineerService,
} from '../engineer-service'

const mockRunnerOutput = (overrides: Partial<EngineerRunnerOutput> = {}): EngineerRunnerOutput => ({
  finalText: 'mock summary',
  numTurns: 1,
  toolCallCount: 0,
  totalCostUsd: 0,
  inputTokens: 0,
  outputTokens: 0,
  cacheCreationTokens: 0,
  cacheReadTokens: 0,
  ...overrides,
})

function makeTempRepo(): { dir: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'saikyo-eng-test-'))
  const run = (...args: string[]) => execFileSync('git', args, { cwd: dir })
  run('init', '-q', '-b', 'main')
  run('config', 'user.email', 'test@example.com')
  run('config', 'user.name', 'test')
  writeFileSync(join(dir, 'README.md'), '# test repo\n')
  run('add', 'README.md')
  run('commit', '-q', '-m', 'init')
  return {
    dir,
    cleanup: () => {
      try {
        rmSync(dir, { recursive: true, force: true })
      } catch {
        // ignore
      }
    },
  }
}

describe('engineerService', () => {
  let userId: string
  let wsId: string
  let cleanup: () => Promise<void>
  let repo: { dir: string; cleanup: () => void }

  beforeAll(async () => {
    const fx = await createTestUserAndWorkspace('engineer-svc')
    userId = fx.userId
    wsId = fx.wsId
    cleanup = fx.cleanup
    await mockAuthGuards(userId, fx.email)
    repo = makeTempRepo()
  })

  afterAll(async () => {
    repo.cleanup()
    await cleanup()
  })

  async function makeItem(title = 'engineer test item'): Promise<string> {
    const ac = adminClient()
    const { data } = await ac
      .from('items')
      .insert({
        workspace_id: wsId,
        title,
        description: 'do something',
        dod: 'PASS',
        is_must: false,
        priority: 3,
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      })
      .select('id')
      .single()
    return data!.id as string
  }

  it('runner が新ファイルを作るとコミットされて changedFiles が返る', async () => {
    const itemId = await makeItem('add-hello')
    const runner: EngineerRunner = async ({ worktreeDir }) => {
      writeFileSync(join(worktreeDir, 'hello.txt'), 'hello world\n')
      return mockRunnerOutput({ finalText: 'created hello.txt' })
    }
    const r = await engineerService.runForItem({
      workspaceId: wsId,
      itemId,
      repoRoot: repo.dir,
      idempotencyKey: 'idem-' + Math.random(),
      runner,
      autoPr: false,
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.changedFiles).toContain('hello.txt')
    expect(r.value.commitSha).toBeTruthy()
    expect(r.value.prUrl).toBeNull()
    expect(r.value.text).toBe('created hello.txt')
  })

  it('runner が何も書き換えなければ commitSha=null', async () => {
    const itemId = await makeItem('no-op')
    const runner: EngineerRunner = async () => mockRunnerOutput({ finalText: 'no changes' })
    const r = await engineerService.runForItem({
      workspaceId: wsId,
      itemId,
      repoRoot: repo.dir,
      idempotencyKey: 'idem-' + Math.random(),
      runner,
      autoPr: false,
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.changedFiles).toHaveLength(0)
    expect(r.value.commitSha).toBeNull()
    expect(r.value.prUrl).toBeNull()
  })

  it('agent_invocations に completed row + targetItemId がセットされる', async () => {
    const itemId = await makeItem('audit-check')
    const runner: EngineerRunner = async ({ worktreeDir }) => {
      writeFileSync(join(worktreeDir, 'a.txt'), 'a\n')
      return mockRunnerOutput({
        finalText: 'wrote a.txt',
        totalCostUsd: 0.001,
        inputTokens: 100,
        outputTokens: 50,
      })
    }
    const r = await engineerService.runForItem({
      workspaceId: wsId,
      itemId,
      repoRoot: repo.dir,
      idempotencyKey: 'idem-' + Math.random(),
      runner,
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const ac = adminClient()
    const { data } = await ac
      .from('agent_invocations')
      .select('status, target_item_id, output, cost_usd, input_tokens')
      .eq('id', r.value.invocationId)
      .single()
    expect(data?.status).toBe('completed')
    expect(data?.target_item_id).toBe(itemId)
    expect(Number(data?.cost_usd)).toBeCloseTo(0.001, 6)
    expect(data?.input_tokens).toBe(100)
    expect((data?.output as { changedFiles: string[] }).changedFiles).toContain('a.txt')
  })

  it('別 workspace の Item は ValidationError', async () => {
    const otherFx = await createTestUserAndWorkspace('engineer-other')
    try {
      const ac = adminClient()
      const { data: otherItem } = await ac
        .from('items')
        .insert({
          workspace_id: otherFx.wsId,
          title: 'other',
          description: 'x',
          created_by_actor_type: 'user',
          created_by_actor_id: otherFx.userId,
        })
        .select('id')
        .single()
      const r = await engineerService.runForItem({
        workspaceId: wsId,
        itemId: otherItem!.id as string,
        repoRoot: repo.dir,
        idempotencyKey: 'idem-' + Math.random(),
        runner: async () => mockRunnerOutput(),
      })
      expect(r.ok).toBe(false)
    } finally {
      await otherFx.cleanup()
    }
  })

  it('runner が throw すると invocation は failed', async () => {
    const itemId = await makeItem('runner-fail')
    const runner: EngineerRunner = async () => {
      throw new Error('claude exploded')
    }
    const r = await engineerService.runForItem({
      workspaceId: wsId,
      itemId,
      repoRoot: repo.dir,
      idempotencyKey: 'idem-' + Math.random(),
      runner,
    })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error.code).toBe('EXTERNAL')

    const ac = adminClient()
    const { data } = await ac
      .from('agent_invocations')
      .select('status, error_message')
      .eq('target_item_id', itemId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    expect(data?.status).toBe('failed')
    expect(data?.error_message).toContain('claude exploded')
  })

  it('worktree は完了後に掃除される (branch も消える)', async () => {
    const itemId = await makeItem('cleanup')
    const runner: EngineerRunner = async ({ worktreeDir }) => {
      writeFileSync(join(worktreeDir, 'cleanup.txt'), 'x\n')
      return mockRunnerOutput()
    }
    const r = await engineerService.runForItem({
      workspaceId: wsId,
      itemId,
      repoRoot: repo.dir,
      idempotencyKey: 'idem-' + Math.random(),
      runner,
    })
    expect(r.ok).toBe(true)

    // worktree list には main + 一時の追加 worktree が無いことを確認
    const out = execFileSync('git', ['worktree', 'list'], { cwd: repo.dir }).toString()
    const lines = out.trim().split('\n')
    expect(lines.length).toBe(1)
    expect(lines[0]).toContain('[main]')
  })
})
