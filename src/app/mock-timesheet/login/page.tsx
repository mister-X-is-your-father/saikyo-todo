import type { Metadata } from 'next'

import { MockLoginForm } from '@/components/mock-timesheet/mock-login-form'

export const metadata: Metadata = {
  title: 'Mock Timesheet ログイン | 最強TODO',
  description:
    '最強TODO の Playwright 自動入力テスト対象 mock 外部システムのログイン画面 (saikyo-todo とは独立)。',
}

export default function MockLoginPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      aria-labelledby="mock-timesheet-heading"
      aria-describedby="mock-timesheet-description"
      className="mx-auto max-w-md space-y-6 p-6 focus-visible:outline-none"
    >
      <header className="space-y-1 border-b pb-4">
        <h1 id="mock-timesheet-heading" className="text-2xl font-bold">
          Mock Timesheet
        </h1>
        <p id="mock-timesheet-description" className="text-muted-foreground text-sm">
          Playwright 自動入力のテスト対象 mock 外部システム。saikyo-todo とは独立。
        </p>
      </header>
      {/* iter1089: /new (h2 新規送信) / /entries (h2 送信済み一覧) と heading hierarchy を揃える。
          h1 "Mock Timesheet" は app 名、h2 でこのページの intent (ログイン) を明示。 */}
      <h2 className="text-lg font-semibold">ログイン</h2>
      <MockLoginForm />
    </main>
  )
}
