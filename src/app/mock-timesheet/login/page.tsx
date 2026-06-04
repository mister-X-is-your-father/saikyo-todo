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
      aria-labelledby="mock-login-heading"
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
          h1 "Mock Timesheet" は app 名、h2 でこのページの intent (ログイン) を明示。
          iter1719: 旧 main aria-labelledby `mock-timesheet-heading` (h1 app 名) は /new
          (`mock-new-heading` 経由 "新規送信")、/entries (`mock-entries-heading` 経由 "送信済み
          一覧") と divergent。main が「今このページで何ができるか」 (page intent) で命名されず
          app 名のみで SR landmark 一覧で /login が「Mock Timesheet」 と /new と区別不能だった。
          h2 に id="mock-login-heading" を付与、main aria-labelledby を新 id に切替で「ログイン」
          を main 名とし、sibling pages convention に揃える。 */}
      <h2 id="mock-login-heading" className="text-lg font-semibold">
        ログイン
      </h2>
      <MockLoginForm />
    </main>
  )
}
