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
    mode: 'onTouched',
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

  function onInvalid(errors: typeof form.formState.errors) {
    const firstError = Object.keys(errors)[0] as keyof MockTimesheetSubmitInput | undefined
    if (firstError) form.setFocus(firstError)
  }

  return (
    <form
      method="post"
      onSubmit={form.handleSubmit(onSubmit, onInvalid)}
      aria-label="Mock Timesheet 工数送信フォーム"
      aria-busy={isPending || undefined}
      noValidate
      className="space-y-4"
      data-testid="mock-submit-form"
    >
      <div className="space-y-2">
        <Label htmlFor="tsDate">勤務日</Label>
        <IMEInput
          id="tsDate"
          type="date"
          aria-invalid={form.formState.errors.workDate ? true : undefined}
          aria-describedby={form.formState.errors.workDate ? 'tsDate-error' : undefined}
          {...form.register('workDate')}
        />
        {form.formState.errors.workDate && (
          <p id="tsDate-error" className="text-destructive text-xs" role="alert">
            {form.formState.errors.workDate.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="tsCategory">カテゴリ</Label>
        <select
          id="tsCategory"
          aria-invalid={form.formState.errors.category ? true : undefined}
          aria-describedby={form.formState.errors.category ? 'tsCategory-error' : undefined}
          {...form.register('category')}
          className="w-full rounded border px-3 py-2 text-sm"
        >
          {TIME_ENTRY_CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
        {form.formState.errors.category && (
          <p id="tsCategory-error" className="text-destructive text-xs" role="alert">
            {form.formState.errors.category.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="tsDescription">作業内容</Label>
        <IMEInput
          id="tsDescription"
          aria-invalid={form.formState.errors.description ? true : undefined}
          aria-describedby={form.formState.errors.description ? 'tsDescription-error' : undefined}
          {...form.register('description')}
        />
        {form.formState.errors.description && (
          <p id="tsDescription-error" className="text-destructive text-xs" role="alert">
            {form.formState.errors.description.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="tsHours">時間 (h, 0.25 刻み)</Label>
        <IMEInput
          id="tsHours"
          type="number"
          step="0.25"
          min="0.25"
          max="24"
          aria-invalid={form.formState.errors.hoursDecimal ? true : undefined}
          aria-describedby={form.formState.errors.hoursDecimal ? 'tsHours-error' : undefined}
          {...form.register('hoursDecimal', { valueAsNumber: true })}
        />
        {form.formState.errors.hoursDecimal && (
          <p id="tsHours-error" className="text-destructive text-xs" role="alert">
            {form.formState.errors.hoursDecimal.message}
          </p>
        )}
      </div>
      <Button
        id="tsSubmit"
        type="submit"
        disabled={isPending}
        className="h-11 w-full"
        aria-label={isPending ? '送信中… (mock-timesheet 工数送信処理を実行中)' : undefined}
      >
        {isPending ? '送信中...' : '送信'}
      </Button>
      {lastRef && (
        // iter444: 送信成功後の external_ref 表示を SR にも届ける。toast.success
        // (sonner) は SR 対応だが過去送信の参照値は permanent display なので
        // role="status" + aria-live="polite" で SR に on-mount 1 回 announce。
        <p
          className="text-muted-foreground text-xs"
          data-external-ref={lastRef}
          data-testid="mock-last-ref"
          role="status"
          aria-live="polite"
        >
          last external_ref: <code>{lastRef}</code>
        </p>
      )}
    </form>
  )
}
