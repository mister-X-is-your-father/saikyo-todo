/**
 * decomposeProposalService integration test (実 Supabase ローカル)。
 *   - listPending / accept / reject / update / rejectAllPending
 *   - 越境 ws 弾き、accept で items に書かれて parent_path が正しい
 *   - accept 済みの再 accept は ValidationError
 */
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { adminClient, createTestUserAndWorkspace, mockAuthGuards } from '@/test/fixtures'

vi.mock('@/lib/auth/guard', () => ({
  requireUser: vi.fn(),
  requireWorkspaceMember: vi.fn(),
  hasAtLeast: () => true,
}))

import { decomposeProposalService } from './service'

async function insertParentItem(wsId: string, userId: string, title = 'parent'): Promise<string> {
  const ac = adminClient()
  const { data } = await ac
    .from('items')
    .insert({
      workspace_id: wsId,
      title,
      description: '',
      status: 'todo',
      is_must: false,
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
    .select('id')
    .single()
  return data!.id as string
}

async function insertProposal(
  wsId: string,
  parentItemId: string,
  overrides: Partial<{
    title: string
    description: string
    is_must: boolean
    dod: string | null
    sort_order: number
    status_proposal: 'pending' | 'accepted' | 'rejected'
  }> = {},
): Promise<string> {
  const ac = adminClient()
  const { data, error } = await ac
    .from('agent_decompose_proposals')
    .insert({
      workspace_id: wsId,
      parent_item_id: parentItemId,
      title: overrides.title ?? 'proposed-child',
      description: overrides.description ?? '',
      is_must: overrides.is_must ?? false,
      dod: overrides.dod ?? null,
      sort_order: overrides.sort_order ?? 0,
      status_proposal: overrides.status_proposal ?? 'pending',
    })
    .select('id')
    .single()
  if (error) throw error
  return data!.id as string
}

describe('decomposeProposalService', () => {
  let userId: string
  let email: string
  let wsId: string
  let cleanup: () => Promise<void>

  beforeAll(async () => {
    const fx = await createTestUserAndWorkspace('decomp-prop')
    userId = fx.userId
    email = fx.email
    wsId = fx.wsId
    cleanup = fx.cleanup
    await mockAuthGuards(userId, email)
  })

  afterAll(async () => {
    await cleanup()
  })

  describe('listPending', () => {
    it('parent に紐づく pending のみ sort_order 順に返す', async () => {
      const parentId = await insertParentItem(wsId, userId, 'parent-list')
      // pending 2 件 + accepted 1 件 (混入させて pending だけ返ることを確認)
      const p1 = await insertProposal(wsId, parentId, { title: 'A', sort_order: 1 })
      const p2 = await insertProposal(wsId, parentId, { title: 'B', sort_order: 0 })
      await insertProposal(wsId, parentId, {
        title: 'already-accepted',
        status_proposal: 'accepted',
      })

      const r = await decomposeProposalService.listPending(parentId)
      expect(r.ok).toBe(true)
      if (!r.ok) return
      // sort_order 0 -> 1
      expect(r.value.map((p) => p.id)).toEqual([p2, p1])
      expect(r.value.every((p) => p.statusProposal === 'pending')).toBe(true)
    })

    it('存在しない parent は NotFoundError', async () => {
      const r = await decomposeProposalService.listPending(randomUUID())
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error.code).toBe('NOT_FOUND')
    })
  })

  describe('accept', () => {
    it('pending を accepted に遷移し、items に新行を作って parent の子になる', async () => {
      const parentId = await insertParentItem(wsId, userId, 'parent-accept')
      const propId = await insertProposal(wsId, parentId, {
        title: 'accept-me',
        description: 'desc',
        is_must: true,
        dod: 'must DoD',
      })

      const r = await decomposeProposalService.accept({ id: propId })
      expect(r.ok).toBe(true)
      if (!r.ok) return
      expect(r.value.proposal.statusProposal).toBe('accepted')
      expect(r.value.proposal.acceptedItemId).toBe(r.value.item.id)

      // items 側を確認
      const ac = adminClient()
      const { data: itemRow } = await ac
        .from('items')
        .select('id, title, is_must, dod, parent_path, status')
        .eq('id', r.value.item.id)
        .single()
      expect(itemRow?.title).toBe('accept-me')
      expect(itemRow?.is_must).toBe(true)
      expect(itemRow?.dod).toBe('must DoD')
      expect(itemRow?.status).toBe('todo')
      // parent の id (hyphen 除去) が ltree path に含まれる
      const cleanedPath = (itemRow?.parent_path as string).replace(/-/g, '')
      expect(cleanedPath).toContain(parentId.replace(/-/g, ''))
    })

    it('既に accepted な提案を再 accept すると ValidationError', async () => {
      const parentId = await insertParentItem(wsId, userId, 'parent-double')
      const propId = await insertProposal(wsId, parentId, { title: 'once' })
      const r1 = await decomposeProposalService.accept({ id: propId })
      expect(r1.ok).toBe(true)
      const r2 = await decomposeProposalService.accept({ id: propId })
      expect(r2.ok).toBe(false)
      if (!r2.ok) expect(r2.error.code).toBe('VALIDATION')
    })

    it('rejected を accept しようとすると ValidationError', async () => {
      const parentId = await insertParentItem(wsId, userId, 'parent-rejected')
      const propId = await insertProposal(wsId, parentId, {
        title: 'rejected',
        status_proposal: 'rejected',
      })
      const r = await decomposeProposalService.accept({ id: propId })
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error.code).toBe('VALIDATION')
    })
  })

  describe('reject', () => {
    it('pending → rejected (acceptedItemId はセットされない)', async () => {
      const parentId = await insertParentItem(wsId, userId, 'parent-reject')
      const propId = await insertProposal(wsId, parentId, { title: 'reject-me' })
      const r = await decomposeProposalService.reject({ id: propId })
      expect(r.ok).toBe(true)
      if (!r.ok) return
      expect(r.value.statusProposal).toBe('rejected')
      expect(r.value.acceptedItemId).toBeNull()
    })
  })

  describe('update', () => {
    it('pending な提案の title / dod を編集できる', async () => {
      const parentId = await insertParentItem(wsId, userId, 'parent-update')
      const propId = await insertProposal(wsId, parentId, { title: 'old', is_must: false })
      const r = await decomposeProposalService.update({
        id: propId,
        patch: { title: 'new title', isMust: true, dod: 'new DoD' },
      })
      expect(r.ok).toBe(true)
      if (!r.ok) return
      expect(r.value.title).toBe('new title')
      expect(r.value.isMust).toBe(true)
      expect(r.value.dod).toBe('new DoD')
    })

    it('isMust=true で dod 空はバリデーションエラー', async () => {
      const parentId = await insertParentItem(wsId, userId, 'parent-mustdod')
      const propId = await insertProposal(wsId, parentId, { title: 'will-must' })
      const r = await decomposeProposalService.update({
        id: propId,
        patch: { isMust: true, dod: '' },
      })
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error.code).toBe('VALIDATION')
    })

    it('accepted 済の提案は編集できない', async () => {
      const parentId = await insertParentItem(wsId, userId, 'parent-readonly')
      const propId = await insertProposal(wsId, parentId, { title: 'frozen' })
      await decomposeProposalService.accept({ id: propId })
      const r = await decomposeProposalService.update({
        id: propId,
        patch: { title: 'try-edit' },
      })
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error.code).toBe('VALIDATION')
    })
  })

  describe('rejectAllPending', () => {
    it('pending を一括却下、accepted は変更しない', async () => {
      const parentId = await insertParentItem(wsId, userId, 'parent-bulk')
      await insertProposal(wsId, parentId, { title: 'pending-1' })
      await insertProposal(wsId, parentId, { title: 'pending-2' })
      const accepted = await insertProposal(wsId, parentId, {
        title: 'already-accepted',
        status_proposal: 'accepted',
      })
      const r = await decomposeProposalService.rejectAllPending({ parentItemId: parentId })
      expect(r.ok).toBe(true)
      if (!r.ok) return
      expect(r.value.count).toBe(2)
      // accepted は変わらない
      const ac = adminClient()
      const { data } = await ac
        .from('agent_decompose_proposals')
        .select('status_proposal')
        .eq('id', accepted)
        .single()
      expect(data?.status_proposal).toBe('accepted')
    })
  })

  describe('cross-workspace', () => {
    it('別 ws の親に紐づく proposal は accept できない (RLS で見えない → NotFoundError)', async () => {
      const other = await createTestUserAndWorkspace('decomp-other')
      const otherParent = await insertParentItem(other.wsId, other.userId)
      const propId = await insertProposal(other.wsId, otherParent, { title: 'other-ws' })
      // 自分の guard を保ったまま、他 ws の id を渡す
      const r = await decomposeProposalService.accept({ id: propId })
      expect(r.ok).toBe(false)
      if (!r.ok) expect(['NOT_FOUND', 'PERMISSION']).toContain(r.error.code)
      await other.cleanup()
    })
  })
})
