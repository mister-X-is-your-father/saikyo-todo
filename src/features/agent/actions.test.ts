/**
 * decomposeItemAction Server Action の最小テスト。
 * researcherService / requireWorkspaceMember を mock、gate と zod を通る経路だけ確認。
 * フル統合 (実 Anthropic / 実 DB) は researcher-service.test で担保済み。
 */
import { randomUUID } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth/guard', () => ({
  requireUser: vi.fn(),
  requireWorkspaceMember: vi.fn(),
  hasAtLeast: () => true,
}))

vi.mock('./researcher-service', () => ({
  researcherService: {
    decomposeItem: vi.fn(),
  },
}))

// actionWrap の revalidatePath 依存を無害化 (Next cache runtime なし)
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import * as guard from '@/lib/auth/guard'
import { ok } from '@/lib/result'

import { decomposeItemAction } from './actions'
import { researcherService } from './researcher-service'

const mockedDecompose = vi.mocked(researcherService.decomposeItem)
const mockedGuard = vi.mocked(guard.requireWorkspaceMember)

describe('decomposeItemAction', () => {
  beforeEach(() => {
    mockedDecompose.mockReset()
    mockedGuard.mockReset().mockResolvedValue({
      user: { id: 'u1', email: 'u@example.com' },
      role: 'member',
    })
    mockedDecompose.mockResolvedValue(
      ok({
        invocationId: 'inv-1',
        agentId: 'agent-1',
        text: 'done',
        toolCalls: [],
        iterations: 1,
        usage: { inputTokens: 10, outputTokens: 5 },
        costUsd: 0.0001,
      }),
    )
  })

  it('workspaceId + itemId を渡すと researcherService に委譲される', async () => {
    const wsId = randomUUID()
    const itemId = randomUUID()
    const r = await decomposeItemAction({ workspaceId: wsId, itemId })
    expect(r.ok).toBe(true)
    expect(mockedGuard).toHaveBeenCalledWith(wsId, 'member')
    expect(mockedDecompose).toHaveBeenCalledTimes(1)
    const call = mockedDecompose.mock.calls[0]![0]
    expect(call.workspaceId).toBe(wsId)
    expect(call.itemId).toBe(itemId)
    expect(typeof call.idempotencyKey).toBe('string')
  })

  it('extraHint も渡される', async () => {
    const wsId = randomUUID()
    const itemId = randomUUID()
    await decomposeItemAction({ workspaceId: wsId, itemId, extraHint: 'FE 優先' })
    const call = mockedDecompose.mock.calls[0]![0]
    expect(call.extraHint).toBe('FE 優先')
  })

  it('workspaceId が UUID でなければ VALIDATION', async () => {
    const r = await decomposeItemAction({ workspaceId: 'not-uuid', itemId: randomUUID() })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.code).toBe('VALIDATION')
    expect(mockedGuard).not.toHaveBeenCalled()
    expect(mockedDecompose).not.toHaveBeenCalled()
  })
})
