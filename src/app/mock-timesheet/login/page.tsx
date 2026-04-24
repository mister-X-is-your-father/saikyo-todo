import { MockLoginForm } from '@/components/mock-timesheet/mock-login-form'

export default function MockLoginPage() {
  return (
    <main className="mx-auto max-w-md space-y-6 p-6">
      <header className="space-y-1 border-b pb-4">
        <h1 className="text-2xl font-bold">Mock Timesheet</h1>
        <p className="text-muted-foreground text-sm">
          Playwright 自動入力のテスト対象 mock 外部システム。saikyo-todo とは独立。
        </p>
      </header>
      <MockLoginForm />
    </main>
  )
}
