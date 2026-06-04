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
        {/* iter1722: 旧 visible は full UUID (例: "ログイン中: 8a3f4b6c-1234-5678-9abc-def012345678")
            で sighted には長すぎて scan しにくい。SR は sr-only で full UUID を読むので情報量は
            維持しつつ、visible を 8 char truncate + horizontal-ellipsis、`title` 属性で hover →
            全 UUID 開示可能に。SR と sighted で情報量等価、visible は scan しやすく。 */}
        <p className="text-muted-foreground text-xs" title={sessionId}>
          <span className="sr-only">現在の session ID: {sessionId}</span>
          <span aria-hidden="true">
            ログイン中: <span className="font-mono">{sessionId.slice(0, 8)}…</span>
          </span>
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
            iter1553-1612 visible 冒頭 em-dash sweep に合わせ visible 冒頭固定 + em-dash 区切。
            iter1718: 旧 form aria-label `"ログアウト — mock-timesheet session を終了"` は子 Button
            の aria-label と完全同一で、SR landmark/rotor 経路で「ログアウト — ...」を form と button
            の 2 回連続読み上げる redundancy。form は landmark/group descriptor として brief 名
            "ログアウト操作" に分け、button 側で詳細 aria-label を維持 (login-form の form aria-labelledby
            + button aria-label が divergent な codebase convention と整合)。 */}
        <form action={mockLogoutAction} aria-label="ログアウト操作">
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
