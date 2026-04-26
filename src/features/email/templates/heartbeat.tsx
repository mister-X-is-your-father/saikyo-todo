/**
 * Heartbeat (MUST 期日接近) 通知メール。
 *
 * notifications.type='heartbeat' を発行したのと同じタイミングで送信される。
 * stage は 7d / 3d / 1d / overdue。
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

export type HeartbeatStage = '7d' | '3d' | '1d' | 'overdue'

export interface HeartbeatEmailProps {
  itemTitle: string
  stage: HeartbeatStage
  /** 'YYYY-MM-DD' */
  dueDate: string
  /** Item を開く絶対 URL (Item dialog deep link 推奨) */
  href: string
}

const STAGE_LABEL: Record<HeartbeatStage, string> = {
  '7d': '7 日後',
  '3d': '3 日後',
  '1d': '1 日後',
  overdue: '期限切れ',
}

export function HeartbeatEmail({ itemTitle, stage, dueDate, href }: HeartbeatEmailProps) {
  const stageLabel = STAGE_LABEL[stage]
  const headline =
    stage === 'overdue'
      ? `MUST Item の期限を超過しています`
      : `MUST Item の期限が ${stageLabel} に迫っています`
  return (
    <Html>
      <Head />
      <Body>
        <Container>
          <Heading as="h2">{headline}</Heading>
          <Section>
            <Text>
              <strong>{itemTitle}</strong>
            </Text>
            <Text>期日: {dueDate}</Text>
          </Section>
          <Section>
            <Button href={href}>Item を開く</Button>
          </Section>
          <Text>※ 通知設定は ワークスペース → 通知設定 から変更できます。</Text>
        </Container>
      </Body>
    </Html>
  )
}

export async function renderHeartbeatEmail(
  props: HeartbeatEmailProps,
): Promise<{ subject: string; html: string; text: string }> {
  const stageLabel = STAGE_LABEL[props.stage]
  const subject =
    props.stage === 'overdue'
      ? `[MUST] 期限超過: ${props.itemTitle}`
      : `[MUST ${stageLabel}] ${props.itemTitle} (${props.dueDate})`
  const element = HeartbeatEmail(props)
  const [html, text] = await Promise.all([
    render(element, { pretty: false }),
    render(element, { plainText: true }),
  ])
  return { subject, html, text }
}
