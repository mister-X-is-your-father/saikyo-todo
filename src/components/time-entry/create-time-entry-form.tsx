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
      /* iter2065: 8 form family の続編 (時間 entry 作成 form 9 個目)、稼働記録 作成 form の
         用途 hover disclose、mock-login/submit iter2061-2063 と同 form landmark pattern。 */
      title="稼働記録 作成フォーム"
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
          className="h-11"
          value={workDate}
          onChange={(e) => setWorkDate(e.target.value)}
          required
          aria-required="true"
          max={new Date().toISOString().slice(0, 10)}
          enterKeyHint="next"
          aria-label={(() => {
            const today = new Date().toISOString().slice(0, 10)
            if (workDate === '') return '日付 (必須、今日まで指定可、未来日付は不正)'
            if (workDate > today)
              return `日付 (現在: ${workDate}、今日 ${today} より後の未来日付で不正)`
            if (workDate === today) return `日付 (現在: ${workDate}、今日)`
            return `日付 (現在: ${workDate}、過去日付)`
          })()}
          /* iter1955: state-dependent aria-label (空 / 未来 / 今日 / 過去) は SR にのみ伝達、
             sighted は date picker visible のみで現在 state context が無い、title で disclose
             (filter-status iter1939 / filter-sprint iter1941 と同 state-dependent input pattern)。 */
          title={(() => {
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
          className="min-h-11 rounded border px-2 text-sm"
          required
          aria-required="true"
          // iter1191: 旧 aria-label `カテゴリ (現在: ${label})` は visible (option text =
          // {label}) を中位置 "カテゴリ (現在: **label**)" に持ち voice control
          // prefix-matching「click {label}」 match 不可 (substring 一致のみ)。
          // filter-status iter1182 / filter-sprint iter1183 / gantt-zoom iter1190 同 sweep。
          aria-label={(() => {
            const visible = TIME_ENTRY_CATEGORIES.find((c) => c.key === category)?.label ?? category
            return `${visible} — カテゴリ (現在: ${visible})`
          })()}
          /* iter1957: teDate iter1955 と pair、category select の現在値を sighted hover で
             disclose (state-dependent input title pattern)。 */
          title={(() => {
            const visible = TIME_ENTRY_CATEGORIES.find((c) => c.key === category)?.label ?? category
            return `${visible} — カテゴリ (現在: ${visible})`
          })()}
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
          className="h-11"
          placeholder="例: PR レビュー + フィードバック対応"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          aria-required="true"
          aria-invalid={(description.length > 0 && description.trim() === '') || undefined}
          /* iter1681: 作業内容は task title 系 hot path (iter350 quick-add convention)、
             browser autoComplete 候補は無関係、suggested 候補のチラ見えは集中阻害なので "off"。 */
          autoComplete="off"
          minLength={1}
          maxLength={500}
          enterKeyHint="next"
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
          className="h-11 w-24"
          required
          aria-required="true"
          aria-invalid={durationMinutes <= 0 || durationMinutes > 24 * 60 || undefined}
          inputMode="numeric"
          enterKeyHint="send"
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
          // iter1113: visible "記録" を aria-label 冒頭固定 (iter1093-1112 sweep)。
          // 旧 default "稼働記録を作成" は visible "記録" を "稼働**記録**" 中位置に持ち、
          // voice control prefix-matching「click 記録」 match 不可。pending state visible "…"
          // (1 char) は aria-label 末尾の "…" と substring 一致するが prefix では無いため、
          // visible は短すぎて pure prefix 化が冗長 (記録中… のような visible は無い) — substring 維持。
          aria-label={create.isPending ? '稼働記録を作成中…' : '記録 — 稼働記録を作成'}
          // iter1799: iter1795-1797 auth/mock submit と同 pattern を create-time-entry にも展開。
          title={create.isPending ? '稼働記録を作成中…' : '記録 — 稼働記録を作成'}
          className="h-11 px-4"
        >
          {/* iter1090: visible は ASCII '...' (U+002E×3) で aria-label は U+2026 '…' を使い
              literal substring 不一致 = WCAG 2.5.3 違反 + voice control 不可。
              iter1078b-1083 / quick-add 同 sweep を create-time-entry-form にも展開、U+2026 に統一。 */}
          <span aria-hidden="true">{create.isPending ? '…' : '記録'}</span>
        </Button>
      </div>
    </form>
  )
}
