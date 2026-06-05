'use client'

/**
 * Template の子 item 編集。inline 追加 + 一覧。MVP 最小: title + isMust + dod + dueOffsetDays。
 * parent_path は root 固定 (MVP)、階層展開は Day 14 で本格対応。
 */
import { useState } from 'react'

import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { isAppError } from '@/lib/errors'

import {
  useAddTemplateItem,
  useRemoveTemplateItem,
  useTemplateItems,
} from '@/features/template/hooks'

import { EmptyState, ErrorState, Loading } from '@/components/shared/async-states'
import { IMEInput } from '@/components/shared/ime-input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { MustBadge } from '@/components/workspace/must-badge'

interface Props {
  templateId: string
}

export function TemplateItemsEditor({ templateId }: Props) {
  const items = useTemplateItems(templateId)
  const addMut = useAddTemplateItem(templateId)
  const removeMut = useRemoveTemplateItem(templateId)

  const [title, setTitle] = useState('')
  const [isMust, setIsMust] = useState(false)
  const [dod, setDod] = useState('')
  const [dueOffset, setDueOffset] = useState('')

  async function handleAdd() {
    const t = title.trim()
    if (!t) return
    try {
      await addMut.mutateAsync({
        templateId,
        title: t,
        description: '',
        parentPath: '',
        statusInitial: 'todo',
        dueOffsetDays: dueOffset ? Number(dueOffset) : null,
        isMust,
        dod: isMust ? dod.trim() : null,
        defaultAssignees: [],
        agentRoleToInvoke: null,
      })
      setTitle('')
      setIsMust(false)
      setDod('')
      setDueOffset('')
      toast.success('追加しました')
    } catch (e) {
      toast.error(isAppError(e) ? e.message : '追加に失敗しました')
    }
  }

  async function handleRemove(id: string, title: string) {
    if (
      !window.confirm(
        `Template item「${title}」を削除しますか?\n(template に紐づいた今後の展開には影響しないが、過去 instance はそのまま)`,
      )
    )
      return
    try {
      await removeMut.mutateAsync({ id })
      toast.success('削除しました')
    } catch (e) {
      toast.error(isAppError(e) ? e.message : '削除に失敗しました')
    }
  }

  return (
    <div className="space-y-4" data-testid="template-items-editor">
      <form
        className="space-y-2 rounded-md border p-3"
        noValidate
        aria-label="Template 子 Item 追加フォーム"
        aria-busy={addMut.isPending || undefined}
        data-testid="template-items-add-form"
        onSubmit={(e) => {
          e.preventDefault()
          void handleAdd()
        }}
      >
        <div className="flex gap-2">
          <IMEInput
            placeholder="子 Item のタイトル"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-11 flex-1"
            aria-label={
              title.length === 0
                ? '子 Item のタイトル (必須、最大 500 文字、Mustache 変数 {{var}} 利用可)'
                : title.trim() === ''
                  ? `子 Item のタイトル (現在 ${title.length} / 500 文字、空白のみは不正)`
                  : title.length > 480
                    ? `子 Item のタイトル (現在 ${title.length} / 500 文字、上限近接)`
                    : `子 Item のタイトル (現在 ${title.length} / 500 文字)`
            }
            required
            aria-required="true"
            aria-invalid={(title.length > 0 && title.trim() === '') || undefined}
            minLength={1}
            maxLength={500}
            autoComplete="off"
            enterKeyHint="next"
            /* iter1987: state-dependent aria-label を title で sighted hover disclose、
               10 state-dependent input family の続編 (goal-title/desc iter1983/1985 と pair)。 */
            title={
              title.length === 0
                ? '子 Item のタイトル (必須、最大 500 文字、Mustache 変数 {{var}} 利用可)'
                : title.trim() === ''
                  ? `子 Item のタイトル (現在 ${title.length} / 500 文字、空白のみは不正)`
                  : title.length > 480
                    ? `子 Item のタイトル (現在 ${title.length} / 500 文字、上限近接)`
                    : `子 Item のタイトル (現在 ${title.length} / 500 文字)`
            }
          />
          <input
            type="number"
            placeholder="期日 offset 日"
            value={dueOffset}
            onChange={(e) => setDueOffset(e.target.value)}
            className="min-h-11 w-28 rounded-md border px-2 text-sm"
            aria-label={(() => {
              if (dueOffset === '')
                return '期日 offset (任意、日数 — 展開日 + N 日後を期日に設定、0-365)'
              const n = Number(dueOffset)
              if (Number.isNaN(n) || n < 0 || n > 365)
                return `期日 offset (有効範囲 0-365、現在値「${dueOffset}」 は範囲外)`
              return `期日 offset (現在 ${n} 日 — 展開日から ${n} 日後を期日に設定)`
            })()}
            // iter347: 妥当範囲 0-365 日を HTML5 native で制約 (1 年超は誤入力 / 仕様外)。
            // step=1 で小数入力ガード。inputMode="numeric" で mobile に数字 keypad。
            min={0}
            max={365}
            step={1}
            inputMode="numeric"
            enterKeyHint="send"
            aria-invalid={
              (dueOffset !== '' &&
                (Number.isNaN(Number(dueOffset)) ||
                  Number(dueOffset) < 0 ||
                  Number(dueOffset) > 365)) ||
              undefined
            }
            /* iter1989: state-dependent aria-label (空 / 範囲外 / 通常) を title で sighted
               hover disclose、template-items タイトル input iter1987 と pair、template-items
               2 input sweep 完備 (11 state-dependent input family の続編)。 */
            title={(() => {
              if (dueOffset === '')
                return '期日 offset (任意、日数 — 展開日 + N 日後を期日に設定、0-365)'
              const n = Number(dueOffset)
              if (Number.isNaN(n) || n < 0 || n > 365)
                return `期日 offset (有効範囲 0-365、現在値「${dueOffset}」 は範囲外)`
              return `期日 offset (現在 ${n} 日 — 展開日から ${n} 日後を期日に設定)`
            })()}
          />
        </div>
        <label className="flex min-h-11 items-center gap-1 text-sm">
          <input
            type="checkbox"
            checked={isMust}
            onChange={(e) => setIsMust(e.target.checked)}
            aria-label={
              isMust
                ? 'MUST が ON: 絶対落とさない — DoD 必須、クリックで OFF'
                : 'MUST が OFF: 通常タスク — クリックで ON、DoD 必須化'
            }
            /* iter2367: template-items MUST checkbox の aria-label は state-dependent
               2-path (ON / OFF、DoD 必須化 副作用 含む) で SR には toggle 状態 +
               next action + 副作用を渡すが checkbox 自体には browser tooltip にならず
               sighted は hover で同 context disclose 不可。proposal MUST iter2335 /
               edit-item-must iter2273 と同 MUST checkbox title pattern を template-items
               にも展開、MUST checkbox 3 element family 完成 (item / proposal / template)。 */
            title={
              isMust
                ? 'MUST が ON: 絶対落とさない — DoD 必須、クリックで OFF'
                : 'MUST が OFF: 通常タスク — クリックで ON、DoD 必須化'
            }
          />
          <span aria-hidden="true">MUST (絶対落とさない)</span>
        </label>
        {isMust ? (
          <Textarea
            placeholder="DoD (Definition of Done) を明記"
            value={dod}
            onChange={(e) => setDod(e.target.value)}
            rows={2}
            aria-label={
              dod.length === 0
                ? 'DoD (Definition of Done) — MUST item の完了条件 (必須、何があれば完了とみなすか)'
                : dod.trim() === ''
                  ? `DoD (現在 ${dod.length} 文字、空白のみは不正、MUST item には完了条件が必須)`
                  : `DoD (現在 ${dod.length} 文字、Definition of Done)`
            }
            /* iter2381: template-items DoD textarea の aria-label は state-dependent
               3-path (空 / 空白のみ MUST 不正 / 通常、文字数 + 副作用含む) で SR には
               full context を渡すが browser tooltip にならず sighted は hover で MUST
               item の完了条件 hint / 空白のみ警告 / 文字数 の disclose 不可。
               edit-item-dod iter2355 と同 DoD textarea title-aria sync pattern を
               template-items DoD にも展開、DoD textarea 2 element family 完成
               (edit-item / template-items)。 */
            title={
              dod.length === 0
                ? 'DoD (Definition of Done) — MUST item の完了条件 (必須、何があれば完了とみなすか)'
                : dod.trim() === ''
                  ? `DoD (現在 ${dod.length} 文字、空白のみは不正、MUST item には完了条件が必須)`
                  : `DoD (現在 ${dod.length} 文字、Definition of Done)`
            }
            required
            aria-required="true"
            aria-invalid={(dod.length > 0 && dod.trim() === '') || undefined}
          />
        ) : null}
        <Button
          type="submit"
          size="sm"
          className="min-h-11"
          disabled={addMut.isPending || !title.trim()}
          aria-busy={addMut.isPending || undefined}
          // iter1154: 旧 aria-label 3 path とも visible "+ 追加" を冒頭に持たず
          // ('子 Item を ...' 始まり) voice control prefix-matching「click + 追加 / 追加」
          // match 不可 (substring 一致のみ)。iter1093-1153 sweep convention に揃え
          // visible "+ 追加" 冒頭固定 + em-dash 区切で descriptive 末尾保持。
          aria-label={
            !title.trim()
              ? '+ 追加 — 子 Item を追加するにはタイトルを入力してください'
              : addMut.isPending
                ? '+ 追加 — 子 Item を追加中…'
                : '+ 追加 — 子 Item を Template に追加'
          }
          /* iter2029: state-dependent aria-label (空 / 追加中 / 通常) を title で
             sighted hover disclose、sprint-create-btn / goal-create-btn iter1809 と同
             create button family pattern。 */
          title={
            !title.trim()
              ? '+ 追加 — 子 Item を追加するにはタイトルを入力してください'
              : addMut.isPending
                ? '+ 追加 — 子 Item を追加中…'
                : '+ 追加 — 子 Item を Template に追加'
          }
        >
          <span aria-hidden="true">+ 追加</span>
        </Button>
      </form>

      {items.isLoading ? (
        <Loading />
      ) : items.error ? (
        <ErrorState
          message={isAppError(items.error) ? items.error.message : '取得失敗'}
          onRetry={() => void items.refetch()}
        />
      ) : (items.data?.length ?? 0) === 0 ? (
        <EmptyState title="子 Item がまだありません" />
      ) : (
        <ul
          className="divide-y text-sm"
          aria-label={`Template 子 Item 一覧 — ${items.data!.length} 件`}
          /* iter2159: Template 子 Item 一覧 ul の aria-label は browser tooltip にならず
             sighted は hover で件数 context disclose 不可。backlog-title iter2157 /
             inbox-item iter2155 と同 title=aria-label sync pattern。 */
          title={`Template 子 Item 一覧 — ${items.data!.length} 件`}
        >
          {items.data!.map((it) => (
            <li
              key={it.id}
              className="flex items-center gap-3 py-2"
              // iter1022: 旧 static `data-testid="template-item-row"` は複数 item 並列時
              // 同 testid で locator ambiguous になる divergence。`template-item-row-${it.id}`
              // で unique 化 (iter1020/1021 同 sweep)。
              data-testid={`template-item-row-${it.id}`}
            >
              {/* iter1741: template-item title span は truncate で長 title 切れ、aria-label 無し
                  (textContent が SR label)、sighted は hover で全 title 見れず。title 付与で
                  sighted hover → 全 title disclose (iter1720-1740 sweep を template-item にも)。 */}
              <span className="flex-1 truncate" title={it.title}>
                {it.title}
              </span>
              {it.isMust ? <MustBadge /> : null}
              {it.dueOffsetDays != null ? (
                // iter1066: role 無 span + aria-label を `role="img"` で
                // authoritative 化 (iter1023/1049-1065 同 pattern、role=img
                // sweep 19 弾目)。
                <span
                  className="text-muted-foreground text-xs"
                  role="img"
                  /* iter1574: 旧 `期日 offset +${days} 日` は visible "+${days}日" を末尾に持ち
                     voice control prefix-matching「click +N日」 が strict prefix-match で不可。
                     iter1093-1573 sweep convention で visible 冒頭固定 + em-dash 区切。 */
                  aria-label={`+${it.dueOffsetDays} 日 — 期日 offset`}
                  /* iter1911: visible は +N日 のみで「期日 offset」 context が無い、
                     sighted hover で disclose (notif-pref icon iter1909 / activity-actor
                     iter1905 と同 chip context pattern)。 */
                  title={`+${it.dueOffsetDays} 日 — 期日 offset`}
                >
                  <span aria-hidden="true">+{it.dueOffsetDays}日</span>
                </span>
              ) : null}
              <Button
                variant="ghost"
                size="sm"
                className="min-h-11 min-w-11"
                onClick={() => handleRemove(it.id, it.title)}
                disabled={removeMut.isPending}
                aria-busy={removeMut.isPending || undefined}
                // iter1216: 旧 aria-label は visible 概念名 "削除" を末尾 "Template item「title」
                // を **削除**" に持ち voice control prefix-matching「click 削除」 match 不可
                // (icon-only Trash2、visible text 無、title attribute も無し)。
                // src-delete / wf-delete iter1215 と同 sweep を template item delete にも展開。
                aria-label={
                  removeMut.isPending
                    ? `削除中… — Template item「${it.title}」を削除中`
                    : `削除 — Template item「${it.title}」を削除`
                }
              >
                <Trash2 className="h-4 w-4 text-red-500" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
