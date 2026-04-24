import { redirect } from 'next/navigation'

import { getMockSessionId } from '@/features/mock-timesheet/actions'

import { MockSubmitForm } from '@/components/mock-timesheet/mock-submit-form'
import { MockTopNav } from '@/components/mock-timesheet/mock-top-nav'

export default async function MockNewPage() {
  const sessionId = await getMockSessionId()
  if (!sessionId) redirect('/mock-timesheet/login')

  return (
    <main className="mx-auto max-w-xl space-y-6 p-6">
      <MockTopNav sessionId={sessionId} />
      <MockSubmitForm />
    </main>
  )
}
