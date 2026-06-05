'use client'

/**
 * Templates 一覧 + 新規作成。各カードクリックで詳細 (子 Item 編集) に展開。
 * MVP: 単一ページ完結。drawer / modal は使わず inline expansion。
 */
import { useState } from 'react'

import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { isAppError } from '@/lib/errors'

import { useCreateTemplate, useSoftDeleteTemplate, useTemplates } from '@/features/template/hooks'
import type { Template } from '@/features/template/schema'

import { EmptyState, ErrorState, Loading } from '@/components/shared/async-states'
import { FocusFormCta } from '@/components/shared/focus-form-cta'
import { IMEInput } from '@/components/shared/ime-input'
import { InstantiateForm } from '@/components/template/instantiate-form'
import { TemplateItemsEditor } from '@/components/template/template-items-editor'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface Props {
  workspaceId: string
}

export function TemplatesPanel({ workspaceId }: Props) {
  const list = useTemplates(workspaceId)
  const createMut = useCreateTemplate(workspaceId)
  const deleteMut = useSoftDeleteTemplate(workspaceId)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [kind, setKind] = useState<'manual' | 'recurring'>('manual')
  const [scheduleCron, setScheduleCron] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  async function handleCreate() {
    const n = name.trim()
    if (!n) return
    try {
      await createMut.mutateAsync({
        workspaceId,
        name: n,
        description,
        kind,
        scheduleCron: kind === 'recurring' ? scheduleCron.trim() || null : null,
        variablesSchema: {},
        tags: [],
        idempotencyKey: crypto.randomUUID(),
      })
      setName('')
      setDescription('')
      setKind('manual')
      setScheduleCron('')
      toast.success('Template を作成しました')
    } catch (e) {
      toast.error(isAppError(e) ? e.message : '作成に失敗しました')
    }
  }

  async function handleDelete(t: Template) {
    if (!confirm(`"${t.name}" を削除しますか?`)) return
    try {
      await deleteMut.mutateAsync({ id: t.id, expectedVersion: t.version })
      toast.success('削除しました')
      if (expandedId === t.id) setExpandedId(null)
    } catch (e) {
      toast.error(isAppError(e) ? e.message : '削除に失敗しました')
    }
  }

  return (
    <div className="space-y-6" data-testid="templates-panel">
      <Card role="region" aria-labelledby="templates-new-heading">
        <CardHeader>
          <CardTitle id="templates-new-heading" className="text-base" role="heading" aria-level={2}>
            新規 Template
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-3"
            noValidate
            aria-label="Template 作成フォーム"
            /* iter2259: Template 作成フォーム form の aria-label は browser tooltip にならず
               sighted は hover で form 用途 disclose 不可。MCP path A で /templates 画面探索中に
               発見、Goal 作成フォーム iter2045 / Sprint 作成フォーム iter2043 と同 create-form
               family title pattern を Template にも展開、3 entity create-form (Goal / Sprint /
               Template) title 完成。 */
            title="Template 作成フォーム"
            aria-busy={createMut.isPending || undefined}
            onSubmit={(e) => {
              e.preventDefault()
              void handleCreate()
            }}
          >
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <Label htmlFor="tmpl-name">名前</Label>
                <IMEInput
                  id="tmpl-name"
                  className="h-11"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例: クライアント onboarding"
                  required
                  aria-required="true"
                  aria-invalid={(name.length > 0 && name.trim() === '') || undefined}
                  minLength={1}
                  maxLength={200}
                  autoComplete="off"
                  enterKeyHint="next"
                  // iter1205: 旧 aria-label `Template 名前 (...)` (全 4 path) は visible
                  // Label "名前" を中位置 "Template **名前** (...)" に持ち voice control
                  // prefix-matching「click 名前」 match 不可 (substring 一致のみ)。
                  // src-name iter1204 と同 sweep を tmpl-name にも展開。Input は htmlFor
                  // Label が visible なので Label text "名前" を冒頭固定 + em-dash 区切。
                  aria-label={
                    name.length === 0
                      ? '名前 — Template 名前 (必須、最大 200 文字、何を生成するかが分かる名前)'
                      : name.trim() === ''
                        ? `名前 — Template 名前 (現在 ${name.length} / 200 文字、空白のみは不正)`
                        : name.length > 180
                          ? `名前 — Template 名前 (現在 ${name.length} / 200 文字、上限近接)`
                          : `名前 — Template 名前 (現在 ${name.length} / 200 文字)`
                  }
                  /* iter2365: tmpl-name input の aria-label は state-dependent 4-path (空 /
                     空白のみ / 上限近接 / 通常) で SR には full context (validation + 文字数 +
                     用途 hint) を渡すが browser tooltip にならず sighted は hover で同 context
                     disclose 不可。editTitle iter2295 / te-description iter2303 と同 input
                     title-aria sync pattern を Template 名前 input にも展開、Template create
                     form の validation hint 補完。 */
                  title={
                    name.length === 0
                      ? '名前 — Template 名前 (必須、最大 200 文字、何を生成するかが分かる名前)'
                      : name.trim() === ''
                        ? `名前 — Template 名前 (現在 ${name.length} / 200 文字、空白のみは不正)`
                        : name.length > 180
                          ? `名前 — Template 名前 (現在 ${name.length} / 200 文字、上限近接)`
                          : `名前 — Template 名前 (現在 ${name.length} / 200 文字)`
                  }
                />
              </div>
              <div>
                <Label htmlFor="tmpl-kind">種別</Label>
                <select
                  id="tmpl-kind"
                  value={kind}
                  onChange={(e) => setKind(e.target.value as 'manual' | 'recurring')}
                  className="min-h-11 w-full rounded-md border px-3 py-1 text-sm"
                  required
                  aria-required="true"
                  // iter1197: 旧 aria-label `Template 種別 (現在: manual — ...)` は visible
                  // (option text "manual (手動展開)" / "recurring (cron で自動展開)") を
                  // 中位置に持ち voice control prefix-matching「click manual / recurring」
                  // match 不可 (src-kind iter1192 / kr-mode iter1196 同 sweep)。
                  aria-label={(() => {
                    const visible =
                      kind === 'manual'
                        ? 'manual (手動展開のみ、ユーザが「展開」 button で生成)'
                        : kind === 'recurring'
                          ? 'recurring (cron 式に従って worker が自動展開)'
                          : kind
                    return `${visible} — Template 種別 (現在: ${visible})`
                  })()}
                >
                  <option value="manual">manual (手動展開)</option>
                  <option value="recurring">recurring (cron で自動展開)</option>
                </select>
              </div>
            </div>
            <div>
              <Label htmlFor="tmpl-desc">説明 (Cmd/Ctrl+Enter で作成)</Label>
              <Textarea
                id="tmpl-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                // iter330: Cmd/Ctrl+Enter で作成 (iter313-318/iter329 続編)。
                onKeyDown={(e) => {
                  if (
                    (e.metaKey || e.ctrlKey) &&
                    e.key === 'Enter' &&
                    !e.nativeEvent.isComposing &&
                    name.trim() &&
                    !createMut.isPending
                  ) {
                    e.preventDefault()
                    void handleCreate()
                  }
                }}
                rows={2}
                placeholder="このテンプレートが何を生成するか"
                aria-keyshortcuts="Meta+Enter Control+Enter"
                // iter1205: 旧 aria-label `Template の説明 (...)` (全 2 path) は visible
                // Label "説明 (Cmd/Ctrl+Enter で作成)" を中位置 "Template の **説明** (...)" に
                // 持ち voice control prefix-matching「click 説明」 match 不可。tmpl-name
                // と同 sweep を tmpl-desc にも展開。Textarea は htmlFor Label が visible
                // なので Label text "説明" を冒頭固定 + em-dash 区切で descriptive 末尾保持。
                aria-label={
                  description.length === 0
                    ? '説明 — Template の説明 (任意、このテンプレートが何を生成するか、Cmd/Ctrl+Enter で作成)'
                    : `説明 — Template の説明 (現在 ${description.length} 文字、Cmd/Ctrl+Enter で作成)`
                }
              />
            </div>
            {kind === 'recurring' ? (
              <div>
                <Label htmlFor="tmpl-cron">cron 式</Label>
                <IMEInput
                  id="tmpl-cron"
                  value={scheduleCron}
                  onChange={(e) => setScheduleCron(e.target.value)}
                  placeholder="0 9 * * 1  (毎週月曜 09:00)"
                  className="h-11 font-mono"
                  autoComplete="off"
                  spellCheck={false}
                  enterKeyHint="send"
                  aria-label={
                    scheduleCron.length === 0
                      ? 'cron 式 (任意、5 フィールド標準 cron 形式 — 例: 「0 9 * * 1」 で毎週月曜 09:00)'
                      : `cron 式 (現在 ${scheduleCron.length} 文字、5 フィールド標準形式)`
                  }
                />
              </div>
            ) : null}
            <Button
              type="submit"
              className="min-h-11"
              disabled={createMut.isPending || !name.trim()}
              aria-busy={createMut.isPending || undefined}
              aria-keyshortcuts="Meta+Enter Control+Enter"
              // iter1110: visible "作成" を aria-label 冒頭固定 (iter1093-1109 sweep convention)。
              // 旧 default/pending は visible 末尾持ちで voice control prefix-matching match 不可。
              // iter1174: iter1110 では「empty-title path は visible '作成' が '作成するには...'
              // prefix で維持」と判断したが、prefix は 'Template' で始まり visible "作成" は
              // 中位置 "Template を **作成** するには…" の substring に過ぎず prefix-match 不可
              // (iter1169-1173 と同 sweep 残漏 pattern)。3 path とも visible 冒頭固定で統一。
              aria-label={
                !name.trim()
                  ? '作成 — Template を作成するには名前を入力してください'
                  : createMut.isPending
                    ? '作成 — Template を作成中…'
                    : '作成 — Template を新規作成 (Cmd/Ctrl+Enter でも可)'
              }
              // iter1811: iter1809 sprint/goal create と同 pattern を Template/Workflow create にも展開。
              title={
                !name.trim()
                  ? '作成 — Template を作成するには名前を入力してください'
                  : createMut.isPending
                    ? '作成 — Template を作成中…'
                    : '作成 — Template を新規作成 (Cmd/Ctrl+Enter でも可)'
              }
            >
              <span aria-hidden="true">作成</span>
            </Button>
          </form>
        </CardContent>
      </Card>

      {list.isLoading ? (
        <Loading />
      ) : list.error ? (
        <ErrorState
          message={isAppError(list.error) ? list.error.message : '一覧取得に失敗しました'}
          onRetry={() => void list.refetch()}
        />
      ) : (list.data?.length ?? 0) === 0 ? (
        <EmptyState
          title="Template がありません"
          description={
            <>
              <p>
                繰り返し発生する作業を <code>1 click で展開</code>{' '}
                できる「即実行ワークパッケージ」。 例:{' '}
                <code className="bg-muted text-foreground rounded px-1 py-0.5 text-[11px]">
                  毎週月曜 朝 9 時 / 週次レビュー
                </code>{' '}
                /{' '}
                <code className="bg-muted text-foreground rounded px-1 py-0.5 text-[11px]">
                  オンボーディング (PR 用 / Doc 設定 / 1on1 予約 …)
                </code>
                。
              </p>
              <p className="mt-1.5">
                展開時に Items を一括生成、recurring (cron) で自動実行も可。Mustache 変数 (
                <code className="bg-muted text-foreground rounded px-1 py-0.5 text-[11px]">
                  {'{{date}}'}
                </code>{' '}
                等) も使えます。
              </p>
            </>
          }
          action={<FocusFormCta targetId="tmpl-name" testId="templates-empty-create" />}
        />
      ) : (
        <ul
          className="space-y-3"
          aria-label={`Template 一覧 — ${list.data!.length} 件`}
          /* iter2261: Template 一覧 ul の aria-label "Template 一覧 — N 件" は browser tooltip
             にならず sighted は hover で count context disclose 不可。sources-list iter2191 /
             workflows-list iter2189 / Goal 一覧 iter2195 と同 title=aria-label sync pattern
             (一覧 ul family) を Template list にも展開、MCP path A で /templates 探索中に発見。 */
          title={`Template 一覧 — ${list.data!.length} 件`}
        >
          {list.data!.map((t) => (
            <li key={t.id}>
              <Card
                // iter1021: 旧 `data-testid="template-card"` は全 template 共通の static
                // testid で複数 template 並列時に locator が ambiguous になる divergence。
                // 他 list-item Card (sprint-card-${id} / goal-card-${id} / wf-card-${id} /
                // src-card-${id} = iter1007 sweep) と同じ `template-card-${id}` 規則に揃え、
                // E2E / audit script からの安定 locate を可能化。
                data-testid={`template-card-${t.id}`}
                role="region"
                aria-labelledby={`template-card-heading-${t.id}`}
              >
                <CardHeader className="flex flex-row items-center justify-between">
                  <button
                    type="button"
                    className="focus-visible:ring-ring flex-1 rounded text-left focus-visible:ring-2 focus-visible:outline-none"
                    onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                    aria-expanded={expandedId === t.id}
                    /* iter1645: controlled CardContent は `{expandedId === t.id}` 条件下のみ
                       render される。expanded 時のみ aria-controls 設定で dangling 回避
                       (iter1637/iter1645 sweep)。 */
                    aria-controls={expandedId === t.id ? `template-body-${t.id}` : undefined}
                    // iter1221: 旧 aria-label `Template「${name}」(...)` は visible {name}
                    // (CardTitle heading) を中位置 "Template「**name**」(...)" に持ち voice
                    // control prefix-matching「click {name}」 match 不可 (substring 一致のみ)。
                    // template-card delete iter1218 と同 sweep を template-card title button
                    // にも展開。visible {name} を冒頭固定 + em-dash 区切で descriptive 末尾保持。
                    aria-label={`${t.name} — Template「${t.name}」(${t.kind}${t.scheduleCron ? ` · ${t.scheduleCron}` : ''}) の詳細を${expandedId === t.id ? '閉じる' : '開く'}`}
                    /* iter2239: template-card title disclosure button の aria-label は
                       state-dependent (expand / collapse、template.name + kind + cron 含む) で
                       SR には full context を渡すが browser tooltip にならず sighted は hover で
                       同 context disclose 不可。proposal-title-btn iter2223 / op-board-itemrow
                       iter2225 と同 list-item disclosure title=aria-label sync pattern。 */
                    title={`${t.name} — Template「${t.name}」(${t.kind}${t.scheduleCron ? ` · ${t.scheduleCron}` : ''}) の詳細を${expandedId === t.id ? '閉じる' : '開く'}`}
                  >
                    <CardTitle
                      id={`template-card-heading-${t.id}`}
                      className="text-base"
                      role="heading"
                      aria-level={3}
                    >
                      {t.name}
                      <span className="text-muted-foreground ml-2 text-xs font-normal">
                        [{t.kind}
                        {t.scheduleCron ? ` · ${t.scheduleCron}` : ''}]
                      </span>
                    </CardTitle>
                    {t.description ? (
                      <p className="text-muted-foreground mt-1 text-sm">{t.description}</p>
                    ) : null}
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="min-h-11 min-w-11"
                    onClick={() => handleDelete(t)}
                    disabled={deleteMut.isPending}
                    aria-busy={deleteMut.isPending || undefined}
                    // iter1218: 旧 aria-label は visible 概念名 "削除" を末尾 "Template「name」
                    // を **削除**" に持ち voice control prefix-matching「click 削除」 match
                    // 不可 (icon-only Trash2、visible text 無、title attribute も無し)。
                    // template-item delete iter1216 と同 sweep を template-card delete にも展開。
                    aria-label={
                      deleteMut.isPending
                        ? `削除中… — Template「${t.name}」を削除中`
                        : `削除 — Template「${t.name}」を削除`
                    }
                    /* iter2317: template-card delete button の aria-label は state-dependent
                       2-path (pending / idle、template.name 含む) で SR には full context を
                       渡すが browser tooltip にならず sighted は hover で同 context disclose
                       不可 (icon-only Trash2 で visible text 無)。MCP path A で /templates 探索
                       中に発見、proposals-accept/reject iter2253 / wf-delete iter1815 と同
                       state-dependent delete button title pattern。 */
                    title={
                      deleteMut.isPending
                        ? `削除中… — Template「${t.name}」を削除中`
                        : `削除 — Template「${t.name}」を削除`
                    }
                  >
                    <Trash2 className="h-4 w-4 text-red-500" aria-hidden="true" />
                  </Button>
                </CardHeader>
                {expandedId === t.id ? (
                  <CardContent className="space-y-4" id={`template-body-${t.id}`}>
                    <InstantiateForm workspaceId={workspaceId} template={t} />
                    <TemplateItemsEditor templateId={t.id} />
                  </CardContent>
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
