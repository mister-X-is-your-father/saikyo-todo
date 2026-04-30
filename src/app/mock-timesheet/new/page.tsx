import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { getMockSessionId } from '@/features/mock-timesheet/actions'

import { MockSubmitForm } from '@/components/mock-timesheet/mock-submit-form'
import { MockTopNav } from '@/components/mock-timesheet/mock-top-nav'

export const metadata: Metadata = {
  title: 'Mock Timesheet 新規送信 | 最強TODO',
  description:
    '最強TODO の Playwright 自動入力テスト対象 mock 外部システムの新規 timesheet 送信画面。',
}

export default async function MockNewPage() {
  const sessionId = await getMockSessionId()
  if (!sessionId) redirect('/mock-timesheet/login')

  return (
    <main id="main-content" className="mx-auto max-w-xl space-y-6 p-6">
      <MockTopNav sessionId={sessionId} />
      <MockSubmitForm />
    </main>
  )
}
