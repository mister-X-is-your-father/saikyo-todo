/**
 * workspaceService integration test.
 * create は PoC で確認済 (RPC 経由)、listStatuses / listForCurrentUser を主対象。
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { createTestUserAndWorkspace, mockAuthGuards } from '@/test/fixtures'

vi.mock('@/lib/auth/guard', () => ({
  requireUser: vi.fn(),
  requireWorkspaceMember: vi.fn(),
  hasAtLeast: () => true,
}))

import { workspaceService } from './service'

describe('workspaceService.listStatuses', () => {
  let userId: string
  let email: string
  let wsId: string
  let cleanup: () => Promise<void>

  beforeAll(async () => {
    const fx = await createTestUserAndWorkspace('ws-svc')
    userId = fx.userId
    email = fx.email
    wsId = fx.wsId
    cleanup = fx.cleanup
    await mockAuthGuards(userId, email)
  })

  afterAll(async () => {
    await cleanup()
  })

  it('create_workspace RPC でデフォルトの 3 status が登録されている (todo / in_progress / done)', async () => {
    const statuses = await workspaceService.listStatuses(wsId)
    expect(statuses.map((s) => s.key)).toEqual(['todo', 'in_progress', 'done'])
  })

  it('order カラム昇順で返る (Kanban 列順)', async () => {
    const statuses = await workspaceService.listStatuses(wsId)
    for (let i = 1; i < statuses.length; i++) {
      expect(statuses[i]!.order).toBeGreaterThanOrEqual(statuses[i - 1]!.order)
    }
  })

  it('各 status は label / color / type を持つ', async () => {
    const statuses = await workspaceService.listStatuses(wsId)
    for (const s of statuses) {
      expect(s.label).toBeTruthy()
      expect(s.color).toMatch(/^#[0-9a-fA-F]{6}$/)
      expect(['todo', 'in_progress', 'done']).toContain(s.type)
    }
  })
})
