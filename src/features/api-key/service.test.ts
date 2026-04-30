/**
 * queue: REST API + MCP server 化 substrate — apiKeyService 最小テスト。
 * 実 Supabase + RLS を通す (vi.mock で guard だけ stub)。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { apiKeyService } from './service'

import { createTestUserAndWorkspace, mockAuthGuards } from '@/test/fixtures'

vi.mock('@/lib/auth/guard')

describe('apiKeyService', () => {
  let wsId: string
  let userId: string
  let cleanup: () => Promise<void>

  beforeEach(async () => {
    const setup = await createTestUserAndWorkspace('api-key')
    wsId = setup.wsId
    userId = setup.userId
    cleanup = setup.cleanup
    await mockAuthGuards(userId, setup.email, 'admin')
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await cleanup()
  })

  it('create: 平文 key + 行を返し、verify で同じ workspace に解決', async () => {
    const r = await apiKeyService.create({
      workspaceId: wsId,
      label: 'Claude Desktop',
      scopes: ['read', 'write'],
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.plaintext).toMatch(/^sk_st_/)
    expect(r.value.apiKey.keyHash).not.toEqual(r.value.plaintext) // hash != plaintext
    expect(r.value.apiKey.scopes).toEqual(['read', 'write'])

    const v = await apiKeyService.verifyPlaintext(r.value.plaintext)
    expect(v.ok).toBe(true)
    if (!v.ok) return
    expect(v.value.workspaceId).toBe(wsId)
    expect(v.value.scopes).toEqual(['read', 'write'])
  })

  it('verify: 不正 plaintext は AuthError', async () => {
    const r = await apiKeyService.verifyPlaintext('sk_st_garbage_does_not_match')
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error.code).toBe('AUTH')
  })

  it('verify: revoke 後は PermissionError', async () => {
    const c = await apiKeyService.create({
      workspaceId: wsId,
      label: 'tmp',
      scopes: ['read'],
    })
    if (!c.ok) throw c.error
    const rev = await apiKeyService.revoke({ id: c.value.apiKey.id })
    expect(rev.ok).toBe(true)

    const v = await apiKeyService.verifyPlaintext(c.value.plaintext)
    expect(v.ok).toBe(false)
    if (v.ok) return
    expect(v.error.code).toBe('PERMISSION')
  })

  it('create: scope 空は ValidationError', async () => {
    const r = await apiKeyService.create({
      workspaceId: wsId,
      label: 'x',
      scopes: [],
    })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error.code).toBe('VALIDATION')
  })
})
