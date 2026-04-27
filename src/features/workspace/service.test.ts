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

  // Phase 6.15 iter131: チームコンテキスト
  it('getTeamContext: 既定は空文字 (workspace_settings 行が無い場合)', async () => {
    const r = await workspaceService.getTeamContext(wsId)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.teamContext).toBe('')
  })

  it('updateTeamContext: 値が永続化される (insert + update 両パス)', async () => {
    const r = await workspaceService.updateTeamContext({
      workspaceId: wsId,
      teamContext: 'チーム方針: TDD。MUST は PR 必須。',
    })
    expect(r.ok).toBe(true)
    const after = await workspaceService.getTeamContext(wsId)
    expect(after.ok).toBe(true)
    if (!after.ok) return
    expect(after.value.teamContext).toBe('チーム方針: TDD。MUST は PR 必須。')

    // 再 update も通る
    const r2 = await workspaceService.updateTeamContext({
      workspaceId: wsId,
      teamContext: 'updated',
    })
    expect(r2.ok).toBe(true)
    const after2 = await workspaceService.getTeamContext(wsId)
    if (!after2.ok) return
    expect(after2.value.teamContext).toBe('updated')
  })

  it('updateTeamContext: 4000 文字超過は ValidationError', async () => {
    const r = await workspaceService.updateTeamContext({
      workspaceId: wsId,
      teamContext: 'x'.repeat(4001),
    })
    expect(r.ok).toBe(false)
  })

  it('getTeamContext: 空 workspaceId は ValidationError', async () => {
    const r = await workspaceService.getTeamContext('')
    expect(r.ok).toBe(false)
  })
})
