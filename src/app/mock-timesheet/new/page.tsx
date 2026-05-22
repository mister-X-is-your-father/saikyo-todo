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
    <main
      id="main-content"
      tabIndex={-1}
      aria-labelledby="mock-new-heading"
      className="mx-auto max-w-xl space-y-6 p-6 focus-visible:outline-none"
    >
      <MockTopNav sessionId={sessionId} />
      {/* iter1087: /mock-timesheet/entries は h2 "送信済み一覧 (N 件)" を持つ一方、
          /new は h2 が無く heading hierarchy 不整合 + SR が「今このページで何ができるか」 を
          visual heading として拾えなかった。entries 側と pair 化して h2 を追加、main の
          aria-label を aria-labelledby に切替で「Mock Timesheet 新規送信」 を heading 集約。 */}
      <h2 id="mock-new-heading" className="text-lg font-semibold">
        新規送信
      </h2>
      <MockSubmitForm />
    </main>
  )
}
