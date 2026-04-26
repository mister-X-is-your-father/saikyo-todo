/**
 * dispatcher integration test。実 Supabase に対して mock_email_outbox に書き込まれることを検証。
 *
 * - service_role 経由なので RLS は読まないが、INSERT は admin で行う前提
 * - workspace は不要 (workspaceId は null 許容)
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { adminClient, createTestUserAndWorkspace } from '@/test/fixtures'

vi.mock('@/lib/auth/guard', () => ({
  requireUser: vi.fn(),
  requireWorkspaceMember: vi.fn(),
  hasAtLeast: () => true,
}))

import { dispatchEmail } from '../dispatcher'

describe('dispatchEmail', () => {
  let userId: string
  let wsId: string
  let cleanup: () => Promise<void>

  beforeAll(async () => {
    const fx = await createTestUserAndWorkspace('email-dispatcher')
    userId = fx.userId
    wsId = fx.wsId
    cleanup = fx.cleanup
  })
  afterAll(async () => {
    await cleanup()
  })

  it('mock_email_outbox に行を書き込み id を返す', async () => {
    const { id } = await dispatchEmail({
      workspaceId: wsId,
      userId,
      toEmail: 'someone@example.com',
      type: 'heartbeat',
      subject: 'sub',
      html: '<p>hi</p>',
      text: 'hi',
    })
    expect(id).toMatch(/[0-9a-f-]{36}/)

    const ac = adminClient()
    const { data, error } = await ac
      .from('mock_email_outbox')
      .select('to_email, type, subject, html_body, text_body, dispatched_at')
      .eq('id', id)
      .single()
    expect(error).toBeNull()
    expect(data?.to_email).toBe('someone@example.com')
    expect(data?.type).toBe('heartbeat')
    expect(data?.subject).toBe('sub')
    expect(data?.html_body).toBe('<p>hi</p>')
    expect(data?.text_body).toBe('hi')
    // mock 実装は INSERT と同時に dispatched_at をセットする
    expect(data?.dispatched_at).toBeTruthy()
  })

  it('type / to_email / subject が正しく永続化される', async () => {
    const { id } = await dispatchEmail({
      workspaceId: wsId,
      userId,
      toEmail: 'a.b+test@example.com',
      type: 'mention',
      subject: 'Hello mention!',
      html: '<h1>x</h1>',
      text: 'x',
    })
    const ac = adminClient()
    const { data } = await ac
      .from('mock_email_outbox')
      .select('to_email, type, subject')
      .eq('id', id)
      .single()
    expect(data?.to_email).toBe('a.b+test@example.com')
    expect(data?.type).toBe('mention')
    expect(data?.subject).toBe('Hello mention!')
  })

  it('複数 dispatch が独立に書き込まれる', async () => {
    const a = await dispatchEmail({
      workspaceId: wsId,
      userId,
      toEmail: 'one@example.com',
      type: 'invite',
      subject: 'one',
      html: '<p>one</p>',
      text: 'one',
    })
    const b = await dispatchEmail({
      workspaceId: wsId,
      userId,
      toEmail: 'two@example.com',
      type: 'sync-failure',
      subject: 'two',
      html: '<p>two</p>',
      text: 'two',
    })
    expect(a.id).not.toBe(b.id)
    const ac = adminClient()
    const { data } = await ac
      .from('mock_email_outbox')
      .select('id, to_email, type')
      .in('id', [a.id, b.id])
    expect(data?.length).toBe(2)
    const byId = new Map(data!.map((r) => [r.id, r] as const))
    expect(byId.get(a.id)?.type).toBe('invite')
    expect(byId.get(a.id)?.to_email).toBe('one@example.com')
    expect(byId.get(b.id)?.type).toBe('sync-failure')
    expect(byId.get(b.id)?.to_email).toBe('two@example.com')
  })

  it('workspaceId / userId が null でも書き込める (system 全体メール想定)', async () => {
    const { id } = await dispatchEmail({
      workspaceId: null,
      userId: null,
      toEmail: 'system@example.com',
      type: 'heartbeat',
      subject: 'system',
      html: '<p>x</p>',
      text: 'x',
    })
    const ac = adminClient()
    const { data } = await ac
      .from('mock_email_outbox')
      .select('workspace_id, user_id')
      .eq('id', id)
      .single()
    expect(data?.workspace_id).toBeNull()
    expect(data?.user_id).toBeNull()
  })
})
