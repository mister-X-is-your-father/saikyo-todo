'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'

import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

import { mockSubmitAction } from '@/features/mock-timesheet/actions'
import {
  type MockTimesheetSubmitInput,
  MockTimesheetSubmitInputSchema,
} from '@/features/mock-timesheet/schema'
import { TIME_ENTRY_CATEGORIES } from '@/features/time-entry/categories'

import { IMEInput } from '@/components/shared/ime-input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function MockSubmitForm() {
  const [isPending, startTransition] = useTransition()
  const [lastRef, setLastRef] = useState<string | null>(null)
  const form = useForm<MockTimesheetSubmitInput>({
    resolver: zodResolver(MockTimesheetSubmitInputSchema),
    defaultValues: {
      workDate: todayISO(),
      category: 'dev',
      description: '',
      hoursDecimal: 1,
    },
  })

  function onSubmit(values: MockTimesheetSubmitInput) {
    startTransition(async () => {
      const r = await mockSubmitAction(values)
      if (!r.ok) {
        toast.error(r.error.message)
        return
      }
      toast.success(`送信しました (external_ref=${r.value.externalRef.slice(0, 8)})`)
      setLastRef(r.value.externalRef)
      form.reset({ ...values, description: '', hoursDecimal: 1 })
    })
  }

  return (
    <form
      method="post"
      onSubmit={form.handleSubmit(onSubmit)}
      className="space-y-4"
      data-testid="mock-submit-form"
    >
      <div className="space-y-2">
        <Label htmlFor="tsDate">勤務日</Label>
        <IMEInput id="tsDate" type="date" {...form.register('workDate')} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="tsCategory">カテゴリ</Label>
        <select
          id="tsCategory"
          {...form.register('category')}
          className="w-full rounded border px-3 py-2 text-sm"
        >
          {TIME_ENTRY_CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="tsDescription">作業内容</Label>
        <IMEInput id="tsDescription" {...form.register('description')} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="tsHours">時間 (h, 0.25 刻み)</Label>
        <IMEInput
          id="tsHours"
          type="number"
          step="0.25"
          min="0.25"
          max="24"
          {...form.register('hoursDecimal', { valueAsNumber: true })}
        />
      </div>
      <Button id="tsSubmit" type="submit" disabled={isPending} className="w-full">
        {isPending ? '送信中...' : '送信'}
      </Button>
      {lastRef && (
        <p
          className="text-muted-foreground text-xs"
          data-external-ref={lastRef}
          data-testid="mock-last-ref"
        >
          last external_ref: <code>{lastRef}</code>
        </p>
      )}
    </form>
  )
}
