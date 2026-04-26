/**
 * Workspace 招待 通知メール。
 *
 * 既存 user を直接 workspace に追加した時に送られる (workspaceService.addMember)。
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

export interface InviteEmailProps {
  workspaceName: string
  /** 招待した人の表示名 */
  invitedBy: string
  /** 'owner' | 'admin' | 'member' | 'viewer' */
  role: string
  /** Workspace を開く絶対 URL */
  href: string
}

export function InviteEmail({ workspaceName, invitedBy, role, href }: InviteEmailProps) {
  return (
    <Html>
      <Head />
      <Body>
        <Container>
          <Heading as="h2">Workspace「{workspaceName}」に招待されました</Heading>
          <Section>
            <Text>
              {invitedBy} さんから「{workspaceName}」に <strong>{role}</strong>{' '}
              として追加されました。
            </Text>
          </Section>
          <Section>
            <Button href={href}>Workspace を開く</Button>
          </Section>
          <Text>※ 通知設定は ワークスペース → 通知設定 から変更できます。</Text>
        </Container>
      </Body>
    </Html>
  )
}

export async function renderInviteEmail(
  props: InviteEmailProps,
): Promise<{ subject: string; html: string; text: string }> {
  const subject = `[招待] ${props.workspaceName} に追加されました`
  const element = InviteEmail(props)
  const [html, text] = await Promise.all([
    render(element, { pretty: false }),
    render(element, { plainText: true }),
  ])
  return { subject, html, text }
}
