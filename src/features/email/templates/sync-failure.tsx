/**
 * Sync failure (外部同期失敗) 通知メール。time-entry / mock-timesheet の失敗で発火。
 *
 * pref のデフォルトは OFF なので、明示 ON にしているユーザにのみ送る。
 */
import { Body, Container, Head, Heading, Html, Section, Text } from '@react-email/components'
import { render } from '@react-email/render'

export interface SyncFailureEmailProps {
  /** 失敗源 (例: 'time-entry') */
  source: string
  /** Error.message を 2000 文字でクリップ済み想定 */
  reason: string
  /** 関連エンティティ id (例: time_entries.id) */
  entryId?: string
}

export function SyncFailureEmail({ source, reason, entryId }: SyncFailureEmailProps) {
  return (
    <Html>
      <Head />
      <Body>
        <Container>
          <Heading as="h2">外部同期に失敗しました</Heading>
          <Section>
            <Text>
              <strong>source:</strong> {source}
            </Text>
            {entryId ? (
              <Text>
                <strong>entry:</strong> {entryId}
              </Text>
            ) : null}
            <Text>
              <strong>reason:</strong> {reason}
            </Text>
          </Section>
          <Text>
            ※ この通知は通知設定で「同期失敗」を ON にしている場合に送信されます。OFF
            にする場合は通知設定から変更できます。
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export async function renderSyncFailureEmail(
  props: SyncFailureEmailProps,
): Promise<{ subject: string; html: string; text: string }> {
  const subject = `[sync-failure] ${props.source} の同期に失敗`
  const element = SyncFailureEmail(props)
  const [html, text] = await Promise.all([
    render(element, { pretty: false }),
    render(element, { plainText: true }),
  ])
  return { subject, html, text }
}
