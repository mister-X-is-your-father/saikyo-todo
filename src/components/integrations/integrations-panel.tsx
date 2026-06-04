'use client'

/**
 * Phase 6.15 iter124-125: 外部 API 連携 (pull 型) UI。
 * - 一覧: name / kind / enabled / 「Pull」「無効化」「削除」
 * - 「Pull」: triggerSourcePullAction で同期 pull → fetched/created/updated を toast に
 * - 作成 form (iter125): kind selector + kind 別 config (yamory: token / custom-rest: url + paths)
 */
import { useState } from 'react'

import { ChevronDown, ChevronRight, Play, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { isAppError } from '@/lib/errors'

import {
  useCreateExternalSource,
  useDeleteExternalSource,
  useExternalSources,
  useSourceImports,
  useTriggerSourcePull,
  useUpdateExternalSource,
} from '@/features/external-source/hooks'
import { importStatusBadgeClass, importStatusLabel } from '@/features/external-source/import-status'
import type { ExternalImport, ExternalSource } from '@/features/external-source/schema'

import { EmptyState, ErrorState, Loading } from '@/components/shared/async-states'
import { FocusFormCta } from '@/components/shared/focus-form-cta'
import { IMEInput } from '@/components/shared/ime-input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

interface Props {
  workspaceId: string
}

export function IntegrationsPanel({ workspaceId }: Props) {
  const list = useExternalSources(workspaceId)

  return (
    <section
      className="space-y-6"
      data-testid="integrations-panel"
      aria-label="API 連携 source 一覧と新規作成"
    >
      <CreateSourceForm workspaceId={workspaceId} />
      {list.isLoading ? (
        <Loading />
      ) : list.error ? (
        <ErrorState
          message={isAppError(list.error) ? list.error.message : '一覧取得に失敗'}
          onRetry={() => void list.refetch()}
        />
      ) : (list.data ?? []).length === 0 ? (
        <EmptyState
          title="外部 API 連携がありません"
          description="上の form から Yamory / カスタム REST を Source として登録すると、定期 / 手動で Item を pull できます。"
          action={<FocusFormCta targetId="src-name" testId="integrations-empty-create" />}
        />
      ) : (
        <ul
          className="space-y-3"
          data-testid="sources-list"
          aria-label={`API 連携 source 一覧 — ${list.data!.length} 件`}
        >
          {list.data!.map((src) => (
            <li key={src.id}>
              <SourceCard workspaceId={workspaceId} src={src} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function SourceCard({ workspaceId, src }: { workspaceId: string; src: ExternalSource }) {
  const update = useUpdateExternalSource(workspaceId)
  const del = useDeleteExternalSource(workspaceId)
  const trigger = useTriggerSourcePull(workspaceId)
  const [importsOpen, setImportsOpen] = useState(false)

  async function toggleEnabled() {
    try {
      await update.mutateAsync({
        id: src.id,
        expectedVersion: src.version,
        patch: { enabled: !src.enabled },
      })
      toast.success(src.enabled ? '無効化しました' : '有効化しました')
    } catch (e) {
      toast.error(isAppError(e) ? e.message : '更新に失敗')
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Source「${src.name}」を削除しますか?`)) return
    try {
      await del.mutateAsync(src.id)
      toast.success('削除しました')
    } catch (e) {
      toast.error(isAppError(e) ? e.message : '削除に失敗')
    }
  }

  async function handlePull() {
    try {
      const r = await trigger.mutateAsync(src.id)
      if (r.status === 'succeeded') {
        toast.success(
          `Pull 成功: fetched=${r.fetched} / created=${r.created} / updated=${r.updated}`,
        )
      } else {
        toast.error(`Pull 失敗: ${r.error ?? 'unknown'}`)
      }
    } catch (e) {
      toast.error(isAppError(e) ? e.message : 'Pull に失敗')
    }
  }

  return (
    <Card
      data-testid={`src-card-${src.id}`}
      role="region"
      aria-labelledby={`src-card-heading-${src.id}`}
    >
      <CardHeader className="pb-2">
        {/* iter1741: truncate で長 src name 切れ、aria-label 無し、sighted hover で全 name
            見れず。title 付与で sighted hover → 全 src.name disclose (iter1740 workflow CardTitle
            と同 pattern を integrations にも、5 entity card 完成: item/sprint/goal/workflow/source)。 */}
        <CardTitle
          id={`src-card-heading-${src.id}`}
          className="truncate text-base"
          role="heading"
          aria-level={3}
          title={src.name}
        >
          {src.name}
        </CardTitle>
        <p className="text-muted-foreground mt-0.5 text-xs">
          kind: {src.kind} · {src.enabled ? '有効' : '無効'}
          {src.scheduleCron ? ` · cron: ${src.scheduleCron}` : ''}
        </p>
      </CardHeader>
      <CardContent>
        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          /* iter1581: paren convention の `(現在:` を iter1578-1580 operations group sweep に
             合わせ em-dash 区切に統一。visible 冒頭 "Source「${name}」" は維持。 */
          aria-label={`Source「${src.name}」の操作 — 現在 ${src.enabled ? '有効' : '無効'}、pull / 編集 / 有効化切替 / 削除`}
        >
          {/* iter1115: src-pull / src-toggle / src-imports-toggle の旧 aria-label は visible
              "Pull" / "Pull 中…" / "無効化"or"有効化" / "履歴" を末尾持ちで voice control
              prefix-matching match 不可。iter1093-1114 sweep convention に合わせ visible 冒頭固定。 */}
          {/* iter1164: src-pull の !src.enabled path で visible "Pull" が
              aria-label 末尾、src-toggle の pending path で visible "無効化"/"有効化"
              が aria-label に含まれず — iter1115 sweep が 2 path 漏れていた。
              visible 冒頭固定 + em-dash 区切で 残りを descriptive 末尾保持。 */}
          <Button
            size="sm"
            className="min-h-11"
            variant="outline"
            onClick={() => void handlePull()}
            disabled={!src.enabled || trigger.isPending}
            aria-busy={trigger.isPending || undefined}
            data-testid={`src-pull-${src.id}`}
            title="手動 pull (sync 実行、30s timeout)"
            aria-label={
              !src.enabled
                ? `Pull — Source「${src.name}」は無効化中のため Pull 不可`
                : trigger.isPending
                  ? `Pull 中… — Source「${src.name}」を Pull 中`
                  : `Pull — Source「${src.name}」を手動 Pull (sync 実行、30s timeout)`
            }
          >
            <Play className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            <span aria-hidden="true">{trigger.isPending ? 'Pull 中…' : 'Pull'}</span>
          </Button>
          {/* iter1815: iter1813 wf-actions と同 pattern を src-* button family にも展開、
              src-card 4 button (pull + toggle + imports-toggle + delete) 全 hover disclosure 完備。 */}
          <Button
            size="sm"
            className="min-h-11"
            variant="ghost"
            onClick={() => void toggleEnabled()}
            disabled={update.isPending}
            aria-busy={update.isPending || undefined}
            data-testid={`src-toggle-${src.id}`}
            aria-label={
              update.isPending
                ? src.enabled
                  ? `無効化 — Source「${src.name}」の状態を更新中…`
                  : `有効化 — Source「${src.name}」の状態を更新中…`
                : src.enabled
                  ? `無効化 — Source「${src.name}」を無効化`
                  : `有効化 — Source「${src.name}」を有効化`
            }
            title={
              update.isPending
                ? src.enabled
                  ? `無効化 — Source「${src.name}」の状態を更新中…`
                  : `有効化 — Source「${src.name}」の状態を更新中…`
                : src.enabled
                  ? `無効化 — Source「${src.name}」を無効化`
                  : `有効化 — Source「${src.name}」を有効化`
            }
          >
            <span aria-hidden="true">{src.enabled ? '無効化' : '有効化'}</span>
          </Button>
          <Button
            size="sm"
            className="min-h-11"
            variant="ghost"
            onClick={() => setImportsOpen((v) => !v)}
            aria-expanded={importsOpen}
            /* iter1645: controlled div は `{importsOpen && (...)}` 条件下のみ render される。
               importsOpen 時のみ aria-controls 設定で dangling 回避 (iter1637/iter1645 sweep)。 */
            aria-controls={importsOpen ? `src-imports-${src.id}` : undefined}
            aria-label={
              importsOpen
                ? `履歴 — Source「${src.name}」の Pull 履歴 (直近 5 件) を閉じる`
                : `履歴 — Source「${src.name}」の Pull 履歴 (直近 5 件) を表示`
            }
            title={
              importsOpen
                ? `履歴 — Source「${src.name}」の Pull 履歴 (直近 5 件) を閉じる`
                : `履歴 — Source「${src.name}」の Pull 履歴 (直近 5 件) を表示`
            }
            data-testid={`src-imports-toggle-${src.id}`}
          >
            {importsOpen ? (
              <ChevronDown className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ChevronRight className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span aria-hidden="true">履歴</span>
          </Button>
          <Button
            size="sm"
            // iter1029: icon-only Button は `min-h-11` で高さ OK だが幅 36px <
            // 44 で WCAG 2.5.5 違反 (iter1024/1028 同 hazard、icon-only standard
            // pattern)。`min-w-11` で両軸 satisfy。
            className="min-h-11 min-w-11"
            variant="ghost"
            onClick={() => void handleDelete()}
            disabled={del.isPending}
            aria-busy={del.isPending || undefined}
            data-testid={`src-delete-${src.id}`}
            // iter1215: 旧 aria-label は visible 概念名 "削除" を末尾 ("Source「name」を **削除**")
            // に持ち voice control prefix-matching「click 削除」 match 不可 (icon-only Trash2
            // で visible text 無、title attribute も無し)。subtasks-indent iter1213 と同 sweep。
            // 概念名 "削除" / "削除中…" を aria-label 冒頭固定 + em-dash 区切で descriptive 末尾保持。
            // iter1815: icon-only Trash2 で sighted は hover で何の操作か即把握できなかった。
            // title 付与で sighted hover で delete context (source name) disclose。
            aria-label={
              del.isPending
                ? `削除中… — Source「${src.name}」を削除中`
                : `削除 — Source「${src.name}」を削除`
            }
            title={
              del.isPending
                ? `削除中… — Source「${src.name}」を削除中`
                : `削除 — Source「${src.name}」を削除`
            }
          >
            <Trash2 className="h-3.5 w-3.5 text-red-500" aria-hidden="true" />
          </Button>
        </div>
        {importsOpen && (
          <div id={`src-imports-${src.id}`} className="mt-3" data-testid={`src-imports-${src.id}`}>
            <SourceImportHistory sourceId={src.id} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Phase 6.15 iter125: 外部 API source 新規作成 form。
 * kind selector で yamory / custom-rest を切替、kind 別の config field を出す。
 * 保存時は zod (CreateSourceInputSchema) で server-side バリデーション。
 */
function CreateSourceForm({ workspaceId }: { workspaceId: string }) {
  const create = useCreateExternalSource(workspaceId)
  const [kind, setKind] = useState<'yamory' | 'custom-rest'>('custom-rest')
  const [name, setName] = useState('')
  // yamory
  const [token, setToken] = useState('')
  const [projectIds, setProjectIds] = useState('') // comma-separated
  // custom-rest
  const [url, setUrl] = useState('')
  const [method, setMethod] = useState<'GET' | 'POST'>('GET')
  const [itemsPath, setItemsPath] = useState('')
  const [idPath, setIdPath] = useState('id')
  const [titlePath, setTitlePath] = useState('title')
  const [duePath, setDuePath] = useState('')

  async function handleSubmit() {
    const trimmed = name.trim()
    if (!trimmed) return
    try {
      if (kind === 'yamory') {
        const ids = projectIds
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
        await create.mutateAsync({
          workspaceId,
          name: trimmed,
          kind: 'yamory',
          config: {
            token,
            ...(ids.length > 0 ? { projectIds: ids } : {}),
          },
          scheduleCron: null,
        })
      } else {
        await create.mutateAsync({
          workspaceId,
          name: trimmed,
          kind: 'custom-rest',
          config: {
            url,
            method,
            ...(itemsPath ? { itemsPath } : {}),
            idPath,
            titlePath,
            ...(duePath ? { duePath } : {}),
          },
          scheduleCron: null,
        })
      }
      toast.success('Source を作成しました')
      // リセット
      setName('')
      setToken('')
      setProjectIds('')
      setUrl('')
      setItemsPath('')
      setDuePath('')
    } catch (e) {
      toast.error(isAppError(e) ? e.message : '作成に失敗')
    }
  }

  return (
    <Card role="region" aria-labelledby="integrations-new-source-heading">
      <CardHeader>
        <CardTitle
          id="integrations-new-source-heading"
          className="text-base"
          role="heading"
          aria-level={2}
        >
          新規 Source
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-3"
          noValidate
          aria-label="External Source 作成フォーム"
          aria-busy={create.isPending || undefined}
          onSubmit={(e) => {
            e.preventDefault()
            void handleSubmit()
          }}
          data-testid="create-source-form"
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="src-kind">種別</Label>
              <select
                id="src-kind"
                value={kind}
                onChange={(e) => setKind(e.target.value as 'yamory' | 'custom-rest')}
                className="min-h-11 w-full rounded-md border px-3 py-1 text-sm"
                required
                aria-required="true"
                // iter1192: 旧 aria-label `Source 種別 (現在: custom-rest — ...)` は visible
                // (option text "custom-rest (汎用 REST)" / "yamory (脆弱性管理)") を中位置
                // に持ち voice control prefix-matching「click custom-rest / yamory」 match 不可
                // (filter-status iter1182 / gantt-zoom iter1190 / teCategory iter1191 同 sweep)。
                aria-label={(() => {
                  const visible =
                    kind === 'custom-rest'
                      ? 'custom-rest — 汎用 REST API、URL / メソッド / items path を自由設定'
                      : kind === 'yamory'
                        ? 'yamory — 脆弱性管理 SaaS の専用コネクタ'
                        : kind
                  return `${visible} — Source 種別 (現在: ${visible})`
                })()}
              >
                <option value="custom-rest">custom-rest (汎用 REST)</option>
                <option value="yamory">yamory (脆弱性管理)</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="src-name">名前</Label>
              <IMEInput
                id="src-name"
                className="h-11"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: Yamory チーム A"
                required
                aria-required="true"
                aria-invalid={(name.length > 0 && name.trim() === '') || undefined}
                minLength={1}
                maxLength={200}
                autoComplete="off"
                enterKeyHint="next"
                // iter1204: 旧 aria-label `Source 名前 (...)` (全 4 path) は visible Label
                // "名前" を中位置 "Source **名前** (...)" に持ち voice control
                // prefix-matching「click 名前」 match 不可 (substring 一致のみ)。
                // wf-name iter1203 と同 sweep を src-name にも展開。Input は htmlFor
                // Label が visible なので Label text "名前" を冒頭固定 + em-dash 区切。
                aria-label={
                  name.length === 0
                    ? '名前 — Source 名前 (必須、最大 200 文字、識別しやすい名前 — 例: Yamory チーム A)'
                    : name.trim() === ''
                      ? `名前 — Source 名前 (現在 ${name.length} / 200 文字、空白のみは不正)`
                      : name.length > 180
                        ? `名前 — Source 名前 (現在 ${name.length} / 200 文字、上限近接)`
                        : `名前 — Source 名前 (現在 ${name.length} / 200 文字)`
                }
              />
            </div>
          </div>

          {kind === 'yamory' ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="src-token">API Token</Label>
                <IMEInput
                  id="src-token"
                  className="h-11"
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Yamory API token"
                  required
                  aria-required="true"
                  minLength={1}
                  // iter345: API token は password manager の auto-fill 対象外、
                  // new-password で suggest は出るが既存 password 補完を避ける。
                  autoComplete="new-password"
                  spellCheck={false}
                  enterKeyHint="next"
                  data-testid="src-token"
                  aria-label={
                    token.length === 0
                      ? 'API Token (必須、Yamory API の secret token、type=password で入力中も非表示)'
                      : `API Token (現在 ${token.length} 文字、type=password で内容は SR にも非表示)`
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="src-project-ids">project IDs (1 件以上)</Label>
                <IMEInput
                  id="src-project-ids"
                  className="h-11"
                  value={projectIds}
                  onChange={(e) => setProjectIds(e.target.value)}
                  placeholder="カンマ区切り (例: proj-a, proj-b)"
                  required
                  aria-required="true"
                  autoComplete="off"
                  spellCheck={false}
                  enterKeyHint="send"
                  aria-label={
                    projectIds.length === 0
                      ? 'project IDs (必須、1 件以上、カンマ区切り — 例: proj-a, proj-b)'
                      : `project IDs (現在 ${projectIds.length} 文字、カンマ区切り)`
                  }
                />
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="space-y-1 md:col-span-2">
                  <Label htmlFor="src-url">URL</Label>
                  <IMEInput
                    id="src-url"
                    className="h-11"
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com/api/items"
                    required
                    aria-required="true"
                    autoComplete="off"
                    spellCheck={false}
                    enterKeyHint="next"
                    data-testid="src-url"
                    aria-label={
                      url.length === 0
                        ? 'URL (必須、https:// または http:// で始まる API endpoint)'
                        : `URL (現在 ${url.length} 文字、API endpoint)`
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="src-method">HTTP メソッド</Label>
                  <select
                    id="src-method"
                    value={method}
                    onChange={(e) => setMethod(e.target.value as 'GET' | 'POST')}
                    className="min-h-11 w-full rounded-md border px-3 py-1 text-sm"
                    required
                    aria-required="true"
                    // iter1193: src-kind iter1192 と同 sweep — 旧 aria-label
                    // `HTTP メソッド (現在: GET — ...)` は visible (option text "GET" / "POST")
                    // を中位置 "(現在: ...)" 内に持ち voice control prefix-matching
                    //「click GET / POST」 match 不可 (substring 一致のみ)。
                    aria-label={(() => {
                      const visible =
                        method === 'GET'
                          ? 'GET — 副作用なし、URL の query で読取り'
                          : method === 'POST'
                            ? 'POST — body 付き送信、subscribe / search 系の API に使う'
                            : method
                      return `${visible} — HTTP メソッド (現在: ${visible})`
                    })()}
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="src-items-path">items path (任意)</Label>
                  <IMEInput
                    id="src-items-path"
                    className="h-11"
                    value={itemsPath}
                    onChange={(e) => setItemsPath(e.target.value)}
                    placeholder="例: data.items (省略で root)"
                    autoComplete="off"
                    spellCheck={false}
                    enterKeyHint="next"
                    aria-label={
                      itemsPath.length === 0
                        ? 'items path (任意、JSON dot-path、省略で response root を items 配列とみなす — 例: data.items)'
                        : `items path (現在 ${itemsPath.length} 文字、JSON dot-path)`
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="src-due-path">due path (任意)</Label>
                  <IMEInput
                    id="src-due-path"
                    className="h-11"
                    value={duePath}
                    onChange={(e) => setDuePath(e.target.value)}
                    placeholder="例: due_date"
                    autoComplete="off"
                    spellCheck={false}
                    enterKeyHint="next"
                    aria-label={
                      duePath.length === 0
                        ? 'due path (任意、各 item から期日を取り出す JSON dot-path — 例: due_date)'
                        : `due path (現在 ${duePath.length} 文字、JSON dot-path)`
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="src-id-path">id path</Label>
                  <IMEInput
                    id="src-id-path"
                    className="h-11"
                    value={idPath}
                    onChange={(e) => setIdPath(e.target.value)}
                    required
                    aria-required="true"
                    minLength={1}
                    autoComplete="off"
                    spellCheck={false}
                    enterKeyHint="next"
                    aria-label={
                      idPath.length === 0
                        ? 'id path (必須、各 item の一意 ID を取り出す JSON dot-path — 例: id)'
                        : `id path (現在 ${idPath.length} 文字、JSON dot-path)`
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="src-title-path">title path</Label>
                  <IMEInput
                    id="src-title-path"
                    className="h-11"
                    value={titlePath}
                    onChange={(e) => setTitlePath(e.target.value)}
                    required
                    aria-required="true"
                    minLength={1}
                    autoComplete="off"
                    spellCheck={false}
                    enterKeyHint="send"
                    aria-label={
                      titlePath.length === 0
                        ? 'title path (必須、各 item のタイトルを取り出す JSON dot-path — 例: title または name)'
                        : `title path (現在 ${titlePath.length} 文字、JSON dot-path)`
                    }
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              className="min-h-11"
              disabled={!name.trim() || create.isPending}
              aria-busy={create.isPending || undefined}
              data-testid="src-create-btn"
              // iter1109: visible-prefix sweep (iter1093-1108) を src-create-btn にも展開。
              // default/pending 旧 aria-label "External Source を新規作成" / "Source を作成中…" は
              // visible "作成" / "作成中…" を末尾持ち。
              // iter1175: iter1109 で「empty-title path は visible '作成' が prefix で維持」と
              // 判断したが、prefix は 'Source' で始まり visible "作成" は中位置 "Source を **作成**
              // するには…" の substring に過ぎず prefix-match 不可 (iter1169-1174 と同 sweep
              // 残漏 pattern)。3 path とも visible 冒頭固定で統一。
              aria-label={
                !name.trim()
                  ? '作成 — Source を作成するには名前を入力してください'
                  : create.isPending
                    ? '作成中… — Source を作成中'
                    : '作成 — External Source を新規作成'
              }
            >
              <span aria-hidden="true">{create.isPending ? '作成中…' : '作成'}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

/**
 * Phase 6.15 iter126: Source の直近 5 件 import (pull) 履歴。
 * status / triggerKind / 開始時刻 / fetched/created/updated を表示。
 */
function SourceImportHistory({ sourceId }: { sourceId: string }) {
  const q = useSourceImports(sourceId)
  if (q.isLoading) {
    return (
      <p className="text-muted-foreground text-xs" role="status" aria-live="polite">
        読み込み中…
      </p>
    )
  }
  if (q.error) {
    return (
      <p className="text-destructive text-xs" role="alert">
        履歴の取得に失敗
      </p>
    )
  }
  const imports = q.data ?? []
  if (imports.length === 0) {
    return (
      <p className="text-muted-foreground text-xs" role="status" aria-live="polite">
        まだ Pull 履歴がありません
      </p>
    )
  }
  return (
    <ul
      className="divide-y rounded border text-xs"
      data-testid={`src-imports-list-${sourceId}`}
      /* iter1587: 旧 aria-label paren convention `"直近の Pull 履歴 X 件 (最新順)"` は iter1093-1586
         sweep の em-dash 区切と divergent。区切のみ '(' → ' — ' に統一、closing ')' は削除。 */
      aria-label={`直近の Pull 履歴 ${imports.length} 件 — 最新順`}
    >
      {imports.map((r) => (
        <li
          key={r.id}
          className="flex flex-wrap items-center gap-2 px-2 py-1.5"
          data-testid={`src-import-row-${r.id}`}
        >
          <ImportStatusBadge status={r.status} />
          <span className="text-muted-foreground">{r.triggerKind}</span>
          <time
            className="text-muted-foreground tabular-nums"
            dateTime={r.startedAt instanceof Date ? r.startedAt.toISOString() : (r.startedAt ?? '')}
          >
            {formatImportTime(r)}
          </time>
          {/* iter1065: role 無 span + aria-label を `role="img"` で
              authoritative 化 (iter1023/1049-1064 同 pattern、role=img sweep
              18 弾目)。Pull count chip。 */}
          <span
            className="text-muted-foreground ml-auto tabular-nums"
            role="img"
            aria-label={`fetched ${r.fetchedCount} / created ${r.createdCount} / updated ${r.updatedCount}`}
          >
            <span aria-hidden="true">
              f={r.fetchedCount} / c={r.createdCount} / u={r.updatedCount}
            </span>
          </span>
          {r.error && (
            <span
              className="text-destructive line-clamp-1 w-full text-[10px]"
              title={r.error}
              /* iter1566: 旧 `Pull エラー: ${r.error}` は ':' colon 区切で visible "${r.error}"
                 (= 隣接 aria-hidden span text) を末尾に持ち voice control prefix-matching 不可。
                 iter1553-1565 sweep convention で visible 冒頭固定 + em-dash 区切。 */
              aria-label={`${r.error} — Pull エラー`}
              role="alert"
            >
              <span aria-hidden="true">{r.error}</span>
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}

function ImportStatusBadge({ status }: { status: string }) {
  const label = importStatusLabel(status)
  const cls = importStatusBadgeClass(status)
  // iter1065: 同 file 内 Pull status badge も役割同期で role=img 化。
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${cls}`}
      role="img"
      /* iter1559: 旧 aria-label `"Pull ステータス: ${label}"` は visible "${label}" を末尾に持ち
         voice control prefix-matching「click 成功」 が strict prefix-match で不可 (substring 一致のみ)。
         iter1553-1558 status/role Badge family と同 pattern、visible 冒頭固定 + em-dash 区切。 */
      aria-label={`${label} — Pull ステータス`}
    >
      <span aria-hidden="true">{label}</span>
    </span>
  )
}

function formatImportTime(r: ExternalImport): string {
  const t = r.startedAt ?? r.createdAt
  if (!t) return '—'
  const d = t instanceof Date ? t : new Date(t)
  return d.toLocaleString('ja-JP')
}
