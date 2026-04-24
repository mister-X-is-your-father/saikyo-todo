import Link from 'next/link'

import { mockLogoutAction } from '@/features/mock-timesheet/actions'

import { Button } from '@/components/ui/button'

export function MockTopNav({ sessionId }: { sessionId: string }) {
  return (
    <header className="flex items-center justify-between border-b pb-3">
      <div>
        <h1 className="text-xl font-bold">Mock Timesheet</h1>
        <p className="text-muted-foreground text-xs">ログイン中: {sessionId}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href="/mock-timesheet/new">新規入力</Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/mock-timesheet/entries">入力一覧</Link>
        </Button>
        <form action={mockLogoutAction}>
          <Button variant="ghost" size="sm" type="submit">
            ログアウト
          </Button>
        </form>
      </div>
    </header>
  )
}
