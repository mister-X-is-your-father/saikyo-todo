/**
 * Mention (コメント @user) 通知メール。
 */
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Section,
  Text,
} from '@react-email/components'
import { render } from '@react-email/render'

export interface MentionEmailProps {
  /** 言及した人の表示名 */
  mentionedBy: string
  /** comment 本文 (200 文字程度に切り詰め済み想定) */
  commentBody: string
  /** どの Item についてか (UI 上の親 Item タイトル) */
  itemTitle: string
  /** Item を開く絶対 URL (deep link, Item dialog 想定) */
  href: string
}

export function MentionEmail({ mentionedBy, commentBody, itemTitle, href }: MentionEmailProps) {
  return (
    <Html>
      <Head />
      <Body>
        <Container>
          <Heading as="h2">{mentionedBy} があなたに言及しました</Heading>
          <Section>
            <Text>
              <strong>Item:</strong> {itemTitle}
            </Text>
            <Text>&ldquo;{commentBody}&rdquo;</Text>
          </Section>
          <Section>
            <Button href={href}>コメントを開く</Button>
          </Section>
          <Text>※ 通知設定は ワークスペース → 通知設定 から変更できます。</Text>
        </Container>
      </Body>
    </Html>
  )
}

export async function renderMentionEmail(
  props: MentionEmailProps,
): Promise<{ subject: string; html: string; text: string }> {
  const subject = `[mention] ${props.mentionedBy} さんから: ${props.itemTitle}`
  const element = MentionEmail(props)
  const [html, text] = await Promise.all([
    render(element, { pretty: false }),
    render(element, { plainText: true }),
  ])
  return { subject, html, text }
}
