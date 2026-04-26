/**
 * 各 template が render で非空の subject / html / text を返すこと。
 * 実 SMTP 時の表示崩れは E2E ではなく Resend 側のテスト基盤に任せる方針なので、
 * ここは「動く + 主要文字列を含む」レベルの最低限カバレッジ。
 */
import { describe, expect, it } from 'vitest'

import { renderHeartbeatEmail } from '../templates/heartbeat'
import { renderInviteEmail } from '../templates/invite'
import { renderMentionEmail } from '../templates/mention'
import { renderSyncFailureEmail } from '../templates/sync-failure'

describe('renderHeartbeatEmail', () => {
  it('返り値が非空 + 重要情報を含む', async () => {
    const out = await renderHeartbeatEmail({
      itemTitle: 'Refactor authentication',
      stage: '1d',
      dueDate: '2026-04-30',
      href: 'http://localhost:3001/ws-id?item=item-id',
    })
    expect(out.subject).toBeTruthy()
    expect(out.subject).toContain('Refactor authentication')
    expect(out.html.length).toBeGreaterThan(20)
    expect(out.text.length).toBeGreaterThan(0)
    expect(out.text).toContain('Refactor authentication')
    expect(out.text).toContain('2026-04-30')
  })

  it('overdue stage は subject に [MUST] 期限超過 を含む', async () => {
    const out = await renderHeartbeatEmail({
      itemTitle: 'foo',
      stage: 'overdue',
      dueDate: '2026-04-01',
      href: 'http://localhost:3001/ws/1',
    })
    expect(out.subject).toContain('期限超過')
  })
})

describe('renderMentionEmail', () => {
  it('返り値が非空 + 重要情報を含む', async () => {
    const out = await renderMentionEmail({
      mentionedBy: 'Alice',
      commentBody: 'please review this PR',
      itemTitle: 'API redesign',
      href: 'http://localhost:3001/ws-id?item=item-id',
    })
    expect(out.subject).toContain('Alice')
    expect(out.subject).toContain('API redesign')
    expect(out.text).toContain('please review this PR')
    expect(out.html.length).toBeGreaterThan(20)
  })
})

describe('renderInviteEmail', () => {
  it('返り値が非空 + 重要情報を含む', async () => {
    const out = await renderInviteEmail({
      workspaceName: 'Engineering',
      invitedBy: 'Bob',
      role: 'admin',
      href: 'http://localhost:3001/ws-id',
    })
    expect(out.subject).toContain('Engineering')
    expect(out.text).toContain('Engineering')
    expect(out.text).toContain('Bob')
    expect(out.text).toContain('admin')
    expect(out.html.length).toBeGreaterThan(20)
  })
})

describe('renderSyncFailureEmail', () => {
  it('返り値が非空 + 重要情報を含む', async () => {
    const out = await renderSyncFailureEmail({
      source: 'time-entry',
      reason: 'timeout after 30s',
      entryId: 'entry-uuid',
    })
    expect(out.subject).toContain('time-entry')
    expect(out.text).toContain('timeout after 30s')
    expect(out.text).toContain('entry-uuid')
    expect(out.html.length).toBeGreaterThan(20)
  })
})
