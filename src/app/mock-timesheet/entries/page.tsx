import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { getMockSessionId } from '@/features/mock-timesheet/actions'
import { mockTimesheetService } from '@/features/mock-timesheet/service'
import { categoryLabel } from '@/features/time-entry/categories'

import { MockTopNav } from '@/components/mock-timesheet/mock-top-nav'

export const metadata: Metadata = {
  title: 'Mock Timesheet 送信済み | 最強TODO',
  description:
    '最強TODO の Playwright 自動入力テスト対象 mock 外部システムの送信済み timesheet 一覧画面。',
}

export default async function MockEntriesPage() {
  const sessionId = await getMockSessionId()
  if (!sessionId) redirect('/mock-timesheet/login')

  const r = await mockTimesheetService.list(sessionId, 100)
  const entries = r.ok ? r.value : []

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto max-w-3xl space-y-6 p-6 focus-visible:outline-none"
    >
      <MockTopNav sessionId={sessionId} />
      <h2 className="text-lg font-semibold">送信済み一覧 ({entries.length} 件)</h2>
      {entries.length === 0 ? (
        <p className="text-muted-foreground text-sm">まだ送信されていません。</p>
      ) : (
        <table className="w-full text-sm" data-testid="mock-entries-table">
          <caption className="sr-only">
            送信済み工数 {entries.length} 件 (列: ID / 日付 / カテゴリ / 作業内容 / 時間 / 送信時刻)
          </caption>
          <thead>
            <tr className="border-b text-left">
              <th scope="col" className="py-2">
                ID
              </th>
              <th scope="col" className="py-2">
                日付
              </th>
              <th scope="col" className="py-2">
                カテゴリ
              </th>
              <th scope="col" className="py-2">
                作業内容
              </th>
              <th scope="col" className="py-2 text-right">
                時間
              </th>
              <th scope="col" className="py-2">
                送信時刻
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => {
              const submittedIso = new Date(e.submittedAt).toISOString()
              return (
                <tr key={e.id} className="border-b align-top" data-testid={`mock-entry-${e.id}`}>
                  <td className="py-2 font-mono text-xs">{e.id.slice(0, 8)}</td>
                  <td className="py-2">
                    <time dateTime={e.workDate}>{e.workDate}</time>
                  </td>
                  <td className="py-2">{categoryLabel(e.category)}</td>
                  <td className="max-w-[280px] truncate py-2">{e.description}</td>
                  <td className="py-2 text-right">{Number(e.hoursDecimal).toFixed(2)}</td>
                  <td className="py-2 text-xs">
                    <time dateTime={submittedIso}>
                      {submittedIso.slice(0, 16).replace('T', ' ')}
                    </time>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </main>
  )
}
