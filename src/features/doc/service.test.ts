/**
 * docService integration test.
 */
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { adminClient, createTestUserAndWorkspace, mockAuthGuards } from '@/test/fixtures'

vi.mock('@/lib/auth/guard', () => ({
  requireUser: vi.fn(),
  requireWorkspaceMember: vi.fn(),
  hasAtLeast: () => true,
}))

// pg-boss (doc-embed ジョブ送信を mock)
vi.mock('@/lib/jobs/queue', () => ({
  startBoss: vi.fn(),
  stopBoss: vi.fn(),
  enqueueJob: vi.fn().mockResolvedValue('mock-job-id'),
  registerWorker: vi.fn(),
  QUEUE_NAMES: ['agent-run', 'doc-embed'],
}))

import { enqueueJob } from '@/lib/jobs/queue'

import { docService } from './service'

const mockEnqueueJob = vi.mocked(enqueueJob)

describe('docService', () => {
  let userId: string
  let email: string
  let wsId: string
  let cleanup: () => Promise<void>

  beforeAll(async () => {
    const fx = await createTestUserAndWorkspace('doc-svc')
    userId = fx.userId
    email = fx.email
    wsId = fx.wsId
    cleanup = fx.cleanup
    await mockAuthGuards(userId, email)
  })

  afterAll(async () => {
    await cleanup()
  })

  beforeEach(() => {
    mockEnqueueJob.mockClear()
  })

  async function createDoc(overrides: Record<string, unknown> = {}) {
    const result = await docService.create({
      workspaceId: wsId,
      title: 'test doc',
      idempotencyKey: randomUUID(),
      ...overrides,
    })
    if (!result.ok) throw new Error(`create failed: ${result.error.message}`)
    return result.value
  }

  describe('create', () => {
    it('最小フィールドで作成', async () => {
      const doc = await createDoc()
      expect(doc.title).toBe('test doc')
      expect(doc.body).toBe('')
      expect(doc.version).toBe(0)
    })

    it('body を指定して作成', async () => {
      const doc = await createDoc({ body: '# Markdown\n本文' })
      expect(doc.body).toBe('# Markdown\n本文')
    })

    it('title 空は ValidationError', async () => {
      const result = await docService.create({
        workspaceId: wsId,
        title: '',
        idempotencyKey: randomUUID(),
      })
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error.code).toBe('VALIDATION')
    })

    it('audit_log に create が残る', async () => {
      const doc = await createDoc({ title: 'audit check' })
      const { data: audits } = await adminClient()
        .from('audit_log')
        .select('action, target_type')
        .eq('target_id', doc.id)
      expect(audits?.some((a) => a.action === 'create' && a.target_type === 'doc')).toBe(true)
    })

    it('create 後に doc-embed ジョブが enqueue される', async () => {
      const doc = await createDoc({ title: 'embed me', body: '埋め込む本文' })
      expect(mockEnqueueJob).toHaveBeenCalledWith('doc-embed', { docId: doc.id })
    })
  })

  describe('update', () => {
    it('正しい expectedVersion で更新', async () => {
      const doc = await createDoc()
      const result = await docService.update({
        id: doc.id,
        expectedVersion: doc.version,
        patch: { title: '更新後' },
      })
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.value.title).toBe('更新後')
    })

    it('古い expectedVersion で ConflictError', async () => {
      const doc = await createDoc()
      await docService.update({
        id: doc.id,
        expectedVersion: doc.version,
        patch: { body: '初' },
      })
      const result = await docService.update({
        id: doc.id,
        expectedVersion: doc.version, // 古い
        patch: { body: '2nd' },
      })
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error.code).toBe('CONFLICT')
    })

    it('空 patch は ValidationError', async () => {
      const doc = await createDoc()
      const result = await docService.update({
        id: doc.id,
        expectedVersion: doc.version,
        patch: {},
      })
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error.code).toBe('VALIDATION')
    })

    it('title 更新で doc-embed が再 enqueue される', async () => {
      const doc = await createDoc({ title: 'before' })
      mockEnqueueJob.mockClear() // create 時の呼び出しを除外
      const r = await docService.update({
        id: doc.id,
        expectedVersion: doc.version,
        patch: { title: 'after' },
      })
      expect(r.ok).toBe(true)
      expect(mockEnqueueJob).toHaveBeenCalledWith('doc-embed', { docId: doc.id })
    })

    it('body を含まない update (sourceTemplateId のみ) は doc-embed を enqueue しない', async () => {
      const doc = await createDoc()
      mockEnqueueJob.mockClear()
      // sourceTemplateId はスキーマで許可されている field
      const r = await docService.update({
        id: doc.id,
        expectedVersion: doc.version,
        patch: { sourceTemplateId: null },
      })
      expect(r.ok).toBe(true)
      expect(mockEnqueueJob).not.toHaveBeenCalled()
    })
  })

  describe('softDelete', () => {
    it('deleted_at セット後は list で返らない', async () => {
      const doc = await createDoc({ title: 'to-delete' })
      const result = await docService.softDelete({
        id: doc.id,
        expectedVersion: doc.version,
      })
      expect(result.ok).toBe(true)
      const list = await docService.list(wsId)
      expect(list.some((d) => d.id === doc.id)).toBe(false)
    })
  })

  describe('list', () => {
    it('workspace 内の active doc のみ返す', async () => {
      const docs = await docService.list(wsId)
      expect(docs.every((d) => d.workspaceId === wsId)).toBe(true)
      expect(docs.every((d) => d.deletedAt === null)).toBe(true)
    })
  })
})
