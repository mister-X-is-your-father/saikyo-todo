'use client'

import { useRef, useState } from 'react'

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
  const minutesRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (durationMinutes <= 0) {
      toast.error('時間 (分) は 1 以上')
      // iter499: validation 失敗時 first invalid field に focus shift (auth /
      // workspace form の onInvalid pattern を非 react-hook-form にも展開)。
      minutesRef.current?.focus()
      minutesRef.current?.select()
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
      noValidate
      aria-label="稼働記録 作成フォーム"
      aria-busy={create.isPending || undefined}
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
          aria-label={(() => {
            const today = new Date().toISOString().slice(0, 10)
            if (workDate === '') return '日付 (必須、今日まで指定可、未来日付は不正)'
            if (workDate > today)
              return `日付 (現在: ${workDate}、今日 ${today} より後の未来日付で不正)`
            if (workDate === today) return `日付 (現在: ${workDate}、今日)`
            return `日付 (現在: ${workDate}、過去日付)`
          })()}
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
          aria-label={`カテゴリ (現在: ${TIME_ENTRY_CATEGORIES.find((c) => c.key === category)?.label ?? category})`}
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
          aria-invalid={(description.length > 0 && description.trim() === '') || undefined}
          minLength={1}
          maxLength={500}
          aria-label={
            description.length === 0
              ? '作業内容 (必須、最大 500 文字、何をやったかを 1 行で)'
              : description.trim() === ''
                ? `作業内容 (現在 ${description.length} / 500 文字、空白のみは不正)`
                : description.length > 480
                  ? `作業内容 (現在 ${description.length} / 500 文字、上限近接)`
                  : `作業内容 (現在 ${description.length} / 500 文字)`
          }
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="teMinutes" className="text-xs">
          分
        </Label>
        <IMEInput
          ref={minutesRef}
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
          aria-invalid={durationMinutes <= 0 || durationMinutes > 24 * 60 || undefined}
          inputMode="numeric"
          aria-label={(() => {
            if (durationMinutes <= 0)
              return `分 (1 以上、最大 1440 = 24h、現在値 ${durationMinutes} は不正)`
            if (durationMinutes > 24 * 60)
              return `分 (有効範囲 1-1440、現在値 ${durationMinutes} は範囲外)`
            const h = Math.floor(durationMinutes / 60)
            const m = durationMinutes % 60
            const hm = h > 0 ? (m > 0 ? `${h}時間${m}分` : `${h}時間`) : `${m}分`
            return `分 (現在 ${durationMinutes} 分 = ${hm}、step 15)`
          })()}
        />
      </div>
      <div className="flex items-end">
        <Button
          type="submit"
          disabled={create.isPending}
          aria-busy={create.isPending || undefined}
          data-testid="create-time-entry-submit"
          aria-label={create.isPending ? '記録中… (稼働記録を作成中)' : '記録 (稼働記録を作成)'}
          className="h-11 px-4"
        >
          <span aria-hidden="true">{create.isPending ? '記録中…' : '記録'}</span>
        </Button>
      </div>
    </form>
  )
}
