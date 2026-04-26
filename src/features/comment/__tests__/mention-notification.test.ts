/**
 * mention 通知 integration test。
 *
 * 流れ:
 *   1. workspace + user A (作者) を作る
 *   2. user B を別 user として作り、同じ workspace の member に追加 (display_name = 既知)
 *   3. user A として item に `@<B の displayName>` を含むコメントを作る
 *   4. notifications テーブルに type='mention' で B 宛の行が入っていることを確認
 *
 * 自己言及 (B が `@<B>` 自分書き) で通知されないこと、@user が ws 外の場合
 * に通知されないことも検証。
 *
 * 注意: extractMentionTokens は pure 関数なので別途 unit test (本ファイル冒頭) でカバー。
 */
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { adminClient, createTestUserAndWorkspace, mockAuthGuards } from '@/test/fixtures'

vi.mock('@/lib/auth/guard', () => ({
  requireUser: vi.fn(),
  requireWorkspaceMember: vi.fn(),
  hasAtLeast: () => true,
}))

import { itemService } from '@/features/item/service'

import { commentService, extractMentionTokens } from '../service'

describe('extractMentionTokens (pure)', () => {
  it('単一の @name を抽出', () => {
    expect(extractMentionTokens('hello @alice please review')).toEqual(['alice'])
  })

  it('複数 + 重複は uniq', () => {
    expect(extractMentionTokens('@alice and @bob; @alice again')).toEqual(['alice', 'bob'])
  })

  it('日本語 displayName を抽出', () => {
    expect(extractMentionTokens('@山田太郎 確認お願いします')).toEqual(['山田太郎'])
  })

  it('email アドレスは抽出しない', () => {
    expect(extractMentionTokens('contact me at user@example.com')).toEqual([])
  })

  it('@ のみは無視', () => {
    expect(extractMentionTokens('only @ symbol')).toEqual([])
  })

  it('空 / 改行で区切られる', () => {
    expect(extractMentionTokens('line1 @alice\nline2 @bob')).toEqual(['alice', 'bob'])
  })

  it('句読点で区切られる', () => {
    expect(extractMentionTokens('hi @alice, can you?')).toEqual(['alice'])
  })
})

describe('commentService.onItem.create — mention 通知', () => {
  let authorId: string
  let authorEmail: string
  let wsId: string
  let cleanup: () => Promise<void>
  let mentionedUserId: string
  let mentionedDisplayName: string
  let outsideUserId: string
  let outsideDisplayName: string
  let outsideCleanup: () => Promise<void>
  let mentionedCleanup: () => Promise<void>
  let itemId: string

  beforeAll(async () => {
    const fx = await createTestUserAndWorkspace('comment-mention')
    authorId = fx.userId
    authorEmail = fx.email
    wsId = fx.wsId
    cleanup = fx.cleanup
    await mockAuthGuards(authorId, authorEmail)

    // 言及対象の user を別途作成して同 workspace に追加
    const ac = adminClient()
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    mentionedDisplayName = `mentioned-${stamp}`
    const mentioned = await ac.auth.admin.createUser({
      email: `mentioned-${stamp}@example.com`,
      password: 'password1234',
      email_confirm: true,
      user_metadata: { display_name: mentionedDisplayName },
    })
    if (mentioned.error || !mentioned.data.user) {
      throw mentioned.error ?? new Error('createUser failed')
    }
    mentionedUserId = mentioned.data.user.id
    mentionedCleanup = async () => {
      await ac.auth.admin.deleteUser(mentionedUserId).catch(() => {})
    }
    // profiles は trigger で auto 作成されるが display_name が user_metadata から
    // 引かれる前提なのでここで明示 upsert する (テスト fixture のパターン)
    await ac
      .from('profiles')
      .upsert({ id: mentionedUserId, display_name: mentionedDisplayName })
      .throwOnError()
    await ac
      .from('workspace_members')
      .insert({ workspace_id: wsId, user_id: mentionedUserId, role: 'member' })
      .throwOnError()

    // workspace 外の user (誤通知してはいけない検証用)
    outsideDisplayName = `outsider-${stamp}`
    const outside = await ac.auth.admin.createUser({
      email: `outsider-${stamp}@example.com`,
      password: 'password1234',
      email_confirm: true,
      user_metadata: { display_name: outsideDisplayName },
    })
    if (outside.error || !outside.data.user) throw outside.error ?? new Error('createUser failed')
    outsideUserId = outside.data.user.id
    outsideCleanup = async () => {
      await ac.auth.admin.deleteUser(outsideUserId).catch(() => {})
    }
    await ac
      .from('profiles')
      .upsert({ id: outsideUserId, display_name: outsideDisplayName })
      .throwOnError()

    const itemResult = await itemService.create({
      workspaceId: wsId,
      title: 'mention host',
      idempotencyKey: randomUUID(),
    })
    if (!itemResult.ok) throw new Error('item setup failed')
    itemId = itemResult.value.id
  })

  afterAll(async () => {
    await outsideCleanup()
    await mentionedCleanup()
    await cleanup()
  })

  it('@<member> を含むコメントで mention 通知が発行される', async () => {
    const result = await commentService.onItem.create({
      itemId,
      body: `お疲れさまです @${mentionedDisplayName} 確認お願いします`,
      idempotencyKey: randomUUID(),
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return

    // notification 行を確認
    const ac = adminClient()
    const { data: notifs } = await ac
      .from('notifications')
      .select('user_id, type, payload')
      .eq('workspace_id', wsId)
      .eq('user_id', mentionedUserId)
      .eq('type', 'mention')
    expect(notifs).toBeTruthy()
    expect(notifs!.length).toBeGreaterThanOrEqual(1)
    const row = notifs!.find(
      (n) => (n.payload as { commentId?: string })?.commentId === result.value.id,
    )
    expect(row).toBeTruthy()
    const p = row!.payload as {
      itemId: string
      commentId: string
      mentionedBy: string
      preview: string
    }
    expect(p.itemId).toBe(itemId)
    expect(p.commentId).toBe(result.value.id)
    expect(p.preview).toContain(mentionedDisplayName)
  })

  it('自己言及 (作者が自分自身を @) では通知が出ない', async () => {
    // author の display_name を取り直す (fixture の label からは推定不可)
    const ac = adminClient()
    const { data: prof } = await ac
      .from('profiles')
      .select('display_name')
      .eq('id', authorId)
      .single()
    const authorName = prof!.display_name as string

    const before = await ac
      .from('notifications')
      .select('id')
      .eq('workspace_id', wsId)
      .eq('user_id', authorId)
      .eq('type', 'mention')
    const beforeCount = before.data?.length ?? 0

    const result = await commentService.onItem.create({
      itemId,
      body: `自分メモ @${authorName} todo`,
      idempotencyKey: randomUUID(),
    })
    expect(result.ok).toBe(true)

    const after = await ac
      .from('notifications')
      .select('id')
      .eq('workspace_id', wsId)
      .eq('user_id', authorId)
      .eq('type', 'mention')
    expect(after.data?.length ?? 0).toBe(beforeCount)
  })

  it('workspace 外 user の displayName への @ では通知が出ない', async () => {
    const result = await commentService.onItem.create({
      itemId,
      body: `external ref @${outsideDisplayName} ignore`,
      idempotencyKey: randomUUID(),
    })
    expect(result.ok).toBe(true)

    const ac = adminClient()
    const { data: notifs } = await ac
      .from('notifications')
      .select('id')
      .eq('user_id', outsideUserId)
      .eq('type', 'mention')
    expect(notifs?.length ?? 0).toBe(0)
  })

  it('mention 解決失敗しても comment 作成は成功する (best-effort)', async () => {
    // 存在しない displayName を mention
    const result = await commentService.onItem.create({
      itemId,
      body: `@nonexistent-${randomUUID().slice(0, 8)} dummy`,
      idempotencyKey: randomUUID(),
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.body).toContain('dummy')
  })
})
