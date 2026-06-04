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
      aria-labelledby="mock-entries-heading"
      className="mx-auto max-w-3xl space-y-6 p-6 focus-visible:outline-none"
    >
      <MockTopNav sessionId={sessionId} />
      <h2 id="mock-entries-heading" className="text-lg font-semibold">
        送信済み一覧 ({entries.length} 件)
      </h2>
      {entries.length === 0 ? (
        <p
          role="status"
          aria-live="polite"
          data-testid="mock-entries-empty"
          className="text-muted-foreground text-sm"
        >
          まだ送信されていません。
        </p>
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
                  {/* iter1721: 旧 <td> は ID column を data cell として扱うが、ID は各 row の
                      unique row identifier。<th scope="row"> に変えると SR は他 column 読み上げ時
                      にも row header (= ID) を context として announce、WCAG 1.3.1 (Info and
                      Relationships) の正しい table structure になる。`font-normal` で <th> default
                      bold を打ち消し既存 visual を維持。 */}
                  <th scope="row" className="py-2 text-left font-mono text-xs font-normal">
                    {e.id.slice(0, 8)}
                  </th>
                  <td className="py-2">
                    <time dateTime={e.workDate}>{e.workDate}</time>
                  </td>
                  <td className="py-2">{categoryLabel(e.category)}</td>
                  {/* iter1720: 旧 td は truncate で 280px 超は visual 切れるが sighted users は
                      hover しても全文を見れない (title 属性無し → browser tooltip 無し)。SR は
                      DOM テキスト全部読むが、sighted は切れた部分を見れず content 把握困難。
                      `title={e.description}` で hover → browser tooltip で全文 disclose、
                      SR には no-op (既に full text 読む)、visible 表示は不変 (`truncate`)。 */}
                  <td className="max-w-[280px] truncate py-2" title={e.description}>
                    {e.description}
                  </td>
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
