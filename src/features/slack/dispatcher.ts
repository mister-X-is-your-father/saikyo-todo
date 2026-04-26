/**
 * Slack 通知 dispatcher (Phase 6.15 iter 29 — POST_MVP "Slack 通知" 着手)。
 *
 * 現状: 完全 mock 実装。`SLACK_WEBHOOK_URL` 環境変数が無ければ console.log のみ
 * (本番投入前に webhook URL を `.env.local` に設定する想定)。
 *
 * 将来:
 *   - workspace 単位の webhook URL を `workspace_settings.slack_webhook_url` 列に保存
 *   - notification_preferences と連動して「Slack 通知 ON/OFF」を user 別に管理
 *   - 失敗時は best-effort で握り潰す (heartbeat / comment / mention の流量を遮らない)
 *
 * Email dispatcher (`src/features/email/dispatcher.ts`) と同じ I/F 形にして、
 * 呼び出し側 (heartbeat / comment / workspace / time-entry) で
 * `dispatchEmail` と並列に呼ぶ前提。
 */
import 'server-only'

export type SlackNotificationType =
  | 'heartbeat'
  | 'mention'
  | 'invite'
  | 'sync-failure'
  | 'agent-result'

export interface SlackMessageToSend {
  workspaceId?: string | null
  /** Slack のチャンネル指定 (省略時は webhook 既定 channel)。`#general` 形式 */
  channel?: string
  type: SlackNotificationType
  /** plain text。Markdown 風の `*bold*` `_italic_` は受け付ける */
  text: string
  /** 任意: メッセージ末尾の link (item / doc / pr 等) */
  linkUrl?: string
  linkLabel?: string
}

const WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL ?? ''

/**
 * Slack に best-effort で投げる。失敗時は ExternalServiceError を throw せず、
 * 呼び出し側 try/catch で握り潰しても OK な設計 (= Promise reject させない)。
 */
export async function dispatchSlack(msg: SlackMessageToSend): Promise<{ delivered: boolean }> {
  if (!WEBHOOK_URL) {
    // mock: 開発環境では console.log のみ
    console.info(
      `[slack-dispatcher MOCK] type=${msg.type} ws=${msg.workspaceId ?? 'system'} channel=${msg.channel ?? '(default)'}`,
    )
    console.info(`  text: ${msg.text}`)
    if (msg.linkUrl) console.info(`  link: ${msg.linkUrl} (${msg.linkLabel ?? msg.linkUrl})`)
    return { delivered: false }
  }
  try {
    const body = {
      text: msg.text + (msg.linkUrl ? `\n<${msg.linkUrl}|${msg.linkLabel ?? msg.linkUrl}>` : ''),
      ...(msg.channel ? { channel: msg.channel } : {}),
    }
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      console.warn(`[slack-dispatcher] webhook returned ${res.status}: ${msg.type}`)
      return { delivered: false }
    }
    return { delivered: true }
  } catch (e) {
    console.warn('[slack-dispatcher] network error:', e instanceof Error ? e.message : e)
    return { delivered: false }
  }
}
