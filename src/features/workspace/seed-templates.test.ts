/**
 * サンプル Template 自動投入の検証。
 * workspaceService.create → 実 Supabase に template + template_items + audit が入るか。
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { adminClient, createTestUser } from '@/test/fixtures'

vi.mock('@/lib/auth/guard', () => ({
  requireUser: vi.fn(),
  requireWorkspaceMember: vi.fn(),
  hasAtLeast: () => true,
}))

vi.mock('@/lib/jobs/queue', () => ({
  enqueueJob: vi.fn().mockResolvedValue('mock'),
  QUEUE_NAMES: ['agent-run', 'doc-embed', 'researcher-decompose'] as const,
}))

import { workspaceService } from './service'

describe('seedSampleTemplate (via workspaceService.create)', () => {
  let cleanup: () => Promise<void>
  let userId: string
  let email: string

  beforeAll(async () => {
    const u = await createTestUser('seed-tmpl')
    userId = u.userId
    email = u.email
    cleanup = u.cleanup
    const guard = await import('@/lib/auth/guard')
    vi.mocked(guard.requireUser).mockResolvedValue({ id: userId, email })
  })

  afterAll(async () => {
    await cleanup()
  })

  it('workspace 作成時に「クライアント onboarding」Template が 1 件自動投入され、子 Template Item が 4 件ぶら下がる', async () => {
    const stamp = Date.now().toString(36)
    const r = await workspaceService.create({
      name: `seed-ws-${stamp}`,
      slug: `seed-ws-${stamp}`,
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const wsId = r.value.id

    const ac = adminClient()
    const { data: templates } = await ac
      .from('templates')
      .select('id, name, kind, tags')
      .eq('workspace_id', wsId)
    const sample = templates?.find((t) => t.name === 'クライアント onboarding')
    expect(sample).toBeTruthy()
    if (!sample) return
    expect(sample.kind).toBe('manual')
    expect(Array.isArray(sample.tags) && sample.tags.includes('sample')).toBe(true)

    const { data: items } = await ac
      .from('template_items')
      .select('title, agent_role_to_invoke, is_must')
      .eq('template_id', sample.id)
    expect(items?.length).toBe(4)
    // Researcher 自動起動付きの item が 1 件ある
    expect(items?.some((i) => i.agent_role_to_invoke === 'researcher')).toBe(true)
    // MUST の item が 1 件ある
    expect(items?.some((i) => i.is_must === true)).toBe(true)

    const { data: audits } = await ac
      .from('audit_log')
      .select('action, target_type')
      .eq('target_id', sample.id)
    expect(audits?.some((a) => a.action === 'seed' && a.target_type === 'template')).toBe(true)
  })
})
