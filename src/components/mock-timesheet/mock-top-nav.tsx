'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { mockLogoutAction } from '@/features/mock-timesheet/actions'

import { Button } from '@/components/ui/button'

export function MockTopNav({ sessionId }: { sessionId: string }) {
  // iter1085: nav の現在地表示が無く SR / 視覚 両方で「今どのページか」識別不能だった。
  // pathname 比較で aria-current="page" + visual variant 切替で landmark 内 current page を明示。
  const pathname = usePathname()
  const isNew = pathname === '/mock-timesheet/new'
  const isEntries = pathname === '/mock-timesheet/entries'
  return (
    <header className="flex items-center justify-between border-b pb-3">
      <div>
        <h1 className="text-xl font-bold">Mock Timesheet</h1>
        <p className="text-muted-foreground text-xs">
          <span className="sr-only">現在の session ID: </span>
          <span aria-hidden="true">ログイン中: </span>
          <span className="font-mono">{sessionId}</span>
        </p>
      </div>
      <nav
        /* iter1608: 旧 aria-label paren convention `"mock-timesheet (新規入力 / 入力一覧 / ログアウト)"` は
           iter1093-1607 sweep の em-dash 区切と divergent。区切のみ '(' → ' — ' に統一、closing ')' は削除。 */
        aria-label="mock-timesheet — 新規入力 / 入力一覧 / ログアウト"
        className="flex items-center gap-2"
      >
        <Button variant={isNew ? 'default' : 'outline'} size="sm" className="min-h-11" asChild>
          <Link href="/mock-timesheet/new" aria-current={isNew ? 'page' : undefined}>
            新規入力
          </Link>
        </Button>
        <Button variant={isEntries ? 'default' : 'outline'} size="sm" className="min-h-11" asChild>
          <Link href="/mock-timesheet/entries" aria-current={isEntries ? 'page' : undefined}>
            入力一覧
          </Link>
        </Button>
        {/* iter1613: 旧 aria-label `"mock-timesheet からログアウト"` は visible "ログアウト" (button)
            を末尾に持ち voice control prefix-matching「click ログアウト」 が strict prefix-match で不可。
            iter1553-1612 visible 冒頭 em-dash sweep に合わせ visible 冒頭固定 + em-dash 区切。 */}
        <form action={mockLogoutAction} aria-label="ログアウト — mock-timesheet session を終了">
          {/* iter1095: 旧 aria-label "mock-timesheet session をログアウト" は visible "ログアウト"
              を末尾に持つ → voice control prefix-matching で「click ログアウト」 match 不可。
              iter1093/1094 sweep convention に合わせ visible 冒頭固定。 */}
          <Button
            variant="ghost"
            size="sm"
            className="min-h-11"
            type="submit"
            aria-label="ログアウト — mock-timesheet session を終了"
          >
            <span aria-hidden="true">ログアウト</span>
          </Button>
        </form>
      </nav>
    </header>
  )
}
