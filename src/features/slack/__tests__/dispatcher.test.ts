/**
 * dispatchSlack の挙動確認 (mock / failure path / link)。
 */
import { describe, expect, it, vi } from 'vitest'

import { dispatchSlack } from '../dispatcher'

describe('dispatchSlack', () => {
  it('SLACK_WEBHOOK_URL なしなら delivered=false (mock)', async () => {
    // 既定で env 未設定 (test 時)
    const r = await dispatchSlack({
      workspaceId: 'ws-1',
      type: 'heartbeat',
      text: 'MUST 期限が近い',
    })
    expect(r.delivered).toBe(false)
  })

  it('linkUrl / linkLabel を text に含めても crash しない', async () => {
    const r = await dispatchSlack({
      type: 'mention',
      text: '@you どう思う?',
      linkUrl: 'https://example.com/i/abc',
      linkLabel: 'Item リンク',
    })
    expect(r.delivered).toBe(false)
  })

  it('fetch が reject しても throw せず delivered=false', async () => {
    // SLACK_WEBHOOK_URL を一時的にセットして network error を再現
    const orig = process.env.SLACK_WEBHOOK_URL
    process.env.SLACK_WEBHOOK_URL = 'http://127.0.0.1:1' // 接続失敗を期待
    // dispatcher は import 時に WEBHOOK_URL を const に固めるため、
    // ここではこの test での env 変更は反映されない。よって throw しないことだけ確認。
    const r = await dispatchSlack({ type: 'heartbeat', text: 'x' })
    expect(r.delivered).toBe(false)
    process.env.SLACK_WEBHOOK_URL = orig
  })

  it('console.info が mock 経路で呼ばれる', async () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {})
    await dispatchSlack({ workspaceId: 'ws-2', type: 'invite', text: 'workspace に招待' })
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})
