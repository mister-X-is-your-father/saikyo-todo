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
          className="h-11"
          enterKeyHint="next"
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
          aria-label={`カテゴリ (現在: ${TIME_ENTRY_CATEGORIES.find((c) => c.key === form.watch('category'))?.label ?? form.watch('category')})`}
          {...form.register('category')}
          className="min-h-11 w-full rounded border px-3 py-2 text-sm"
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
          className="h-11"
          enterKeyHint="next"
          aria-invalid={form.formState.errors.description ? true : undefined}
          aria-describedby={
            form.formState.errors.description
              ? 'tsDescription-hint tsDescription-error'
              : 'tsDescription-hint'
          }
          {...form.register('description')}
        />
        {/* iter740: form hint pattern (iter735race-739race と同じ)。schema 側で
            max(2000) を強制するので、その上限と例 (PR 番号 / Item link 等) を hint に。 */}
        <p id="tsDescription-hint" className="text-muted-foreground text-xs">
          自由記述、最大 2000 文字。例: 「PR #123 review」「Item Y の調査」
        </p>
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
          className="h-11"
          step="0.25"
          min="0.25"
          max="24"
          enterKeyHint="send"
          aria-invalid={form.formState.errors.hoursDecimal ? true : undefined}
          aria-describedby={
            form.formState.errors.hoursDecimal ? 'tsHours-hint tsHours-error' : 'tsHours-hint'
          }
          {...form.register('hoursDecimal', { valueAsNumber: true })}
        />
        {/* iter739: form hint pattern (iter733race-738race と同じ) を mock-submit-form の
            数値 input にも適用。Label の「(h, 0.25 刻み)」は visible だが SR は input 単独
            focus 時に bind された hint を読むので aria-describedby に紐付ける。 */}
        <p id="tsHours-hint" className="text-muted-foreground text-xs">
          0.25 刻み (15 分単位)、最小 0.25 (= 15 分)、最大 24 (= 24 時間)。例: 1.5 = 1 時間 30 分
        </p>
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
        aria-busy={isPending || undefined}
        className="h-11 w-full"
        aria-label={
          isPending
            ? '送信中… (mock-timesheet 工数送信処理を実行中)'
            : '工数を送信 (mock-timesheet 入力フォーム)'
        }
      >
        <span aria-hidden="true">{isPending ? '送信中...' : '送信'}</span>
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
