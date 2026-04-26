'use client'

import { useState } from 'react'

import { toast } from 'sonner'

import { isAppError } from '@/lib/errors'

import { TIME_ENTRY_CATEGORIES, type TimeEntryCategoryKey } from '@/features/time-entry/categories'
import { useCreateTimeEntry } from '@/features/time-entry/hooks'

import { IMEInput } from '@/components/shared/ime-input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function CreateTimeEntryForm({ workspaceId }: { workspaceId: string }) {
  const [workDate, setWorkDate] = useState(todayISO())
  const [category, setCategory] = useState<TimeEntryCategoryKey>('dev')
  const [description, setDescription] = useState('')
  const [durationMinutes, setDurationMinutes] = useState<number>(30)

  const create = useCreateTimeEntry(workspaceId)

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (durationMinutes <= 0) {
      toast.error('時間 (分) は 1 以上')
      return
    }
    try {
      await create.mutateAsync({
        workspaceId,
        workDate,
        category,
        description,
        durationMinutes,
        idempotencyKey: crypto.randomUUID(),
      })
      toast.success('稼働を記録しました')
      setDescription('')
      setDurationMinutes(30)
    } catch (err) {
      toast.error(isAppError(err) ? err.message : '作成に失敗しました')
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-3 md:grid-cols-[auto_auto_1fr_auto_auto]"
      data-testid="create-time-entry-form"
    >
      <div className="space-y-1">
        <Label htmlFor="teDate" className="text-xs">
          日付
        </Label>
        <IMEInput
          id="teDate"
          type="date"
          value={workDate}
          onChange={(e) => setWorkDate(e.target.value)}
          required
          aria-required="true"
          max={new Date().toISOString().slice(0, 10)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="teCategory" className="text-xs">
          カテゴリ
        </Label>
        <select
          id="teCategory"
          value={category}
          onChange={(e) => setCategory(e.target.value as TimeEntryCategoryKey)}
          className="h-9 rounded border px-2 text-sm"
          required
          aria-required="true"
        >
          {TIME_ENTRY_CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="teDescription" className="text-xs">
          作業内容
        </Label>
        <IMEInput
          id="teDescription"
          placeholder="例: PR レビュー + フィードバック対応"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          aria-required="true"
          minLength={1}
          maxLength={500}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="teMinutes" className="text-xs">
          分
        </Label>
        <IMEInput
          id="teMinutes"
          type="number"
          min={1}
          max={24 * 60}
          step={15}
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(Number(e.target.value))}
          className="w-24"
          required
          aria-required="true"
        />
      </div>
      <div className="flex items-end">
        <Button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={create.isPending}
          data-testid="create-time-entry-submit"
        >
          {create.isPending ? '...' : '記録'}
        </Button>
      </div>
    </form>
  )
}
