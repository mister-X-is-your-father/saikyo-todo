'use client'

/**
 * Template を workspace に展開する (instantiate) 実行フォーム。
 * - template + template_items のタイトル/説明/dod から Mustache 変数名を抽出して
 *   動的に入力欄を生成
 * - 「即実行」UX: モーダルを挟まず template カード内に inline 展開
 */
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { toast } from 'sonner'

import { isAppError } from '@/lib/errors'

import { useInstantiateTemplate, useTemplateItems } from '@/features/template/hooks'
import type { Template } from '@/features/template/schema'

import { IMEInput } from '@/components/shared/ime-input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface Props {
  workspaceId: string
  template: Template
}

/** {{var}} / {{ var }} を抽出 (重複除去)。Mustache.parse より緩いが十分 (単純変数のみ)。 */
function extractMustacheVars(...sources: Array<string | null | undefined>): string[] {
  const re = /\{\{\s*([a-zA-Z_][\w]*)\s*\}\}/g
  const set = new Set<string>()
  for (const s of sources) {
    if (!s) continue
    let m: RegExpExecArray | null
    while ((m = re.exec(s)) !== null) set.add(m[1]!)
  }
  return Array.from(set)
}

export function InstantiateForm({ workspaceId, template }: Props) {
  const router = useRouter()
  const items = useTemplateItems(template.id)
  const mut = useInstantiateTemplate(workspaceId)

  const vars = useMemo(() => {
    const sources: string[] = [template.name, template.description]
    for (const it of items.data ?? []) {
      sources.push(it.title, it.description, it.dod ?? '')
    }
    return extractMustacheVars(...sources)
  }, [template.name, template.description, items.data])

  const [values, setValues] = useState<Record<string, string>>({})
  const [override, setOverride] = useState('')

  async function handleInstantiate() {
    try {
      const r = await mut.mutateAsync({
        templateId: template.id,
        variables: values,
        cronRunId: null,
        rootTitleOverride: override.trim() || null,
      })
      toast.success(`展開しました (${r.createdItemCount} items)`)
      // 少し待ってから workspace ページへ戻る (item を見るため)
      router.push(`/${workspaceId}`)
    } catch (e) {
      toast.error(isAppError(e) ? e.message : '展開に失敗しました')
    }
  }

  const formLabelId = `instantiate-heading-${template.id}`
  return (
    <form
      className="space-y-3 rounded-md border p-3"
      noValidate
      aria-busy={mut.isPending || undefined}
      data-testid="instantiate-form"
      aria-labelledby={formLabelId}
      onSubmit={(e) => {
        e.preventDefault()
        void handleInstantiate()
      }}
    >
      <div id={formLabelId} className="text-sm font-medium">
        Template「{template.name}」を展開
      </div>
      <div>
        <Label htmlFor={`override-${template.id}`}>root Item タイトル (任意)</Label>
        <IMEInput
          id={`override-${template.id}`}
          className="h-11"
          placeholder={template.name}
          value={override}
          onChange={(e) => setOverride(e.target.value)}
          maxLength={500}
          enterKeyHint="next"
          /* iter1679: root Item タイトル input は task title 系 (iter350 quick-add /
             iter1623 template-items-editor 同 convention) で browser autoComplete 候補は
             無関係、頻繁な入力 hot path で suggested 候補のチラ見えは集中阻害なので "off"。 */
          autoComplete="off"
          // iter1212: 旧 aria-label empty-path `Template「${name}」展開時の root Item タイトル (...)` は
          // visible Label "root Item タイトル (任意)" を中位置 "Template「name」展開時の **root
          // Item タイトル** (...)" に持ち voice control prefix-matching「click root Item タイトル」
          // match 不可 (substring 一致のみ)。subtasks-bulk iter1211 と同 sweep。他 2 path は
          // 既に visible 冒頭で OK だったので empty-path のみ visible 冒頭固定 + em-dash 区切。
          aria-label={
            override.length === 0
              ? `root Item タイトル — Template「${template.name}」展開時の root Item タイトル (任意、最大 500 文字、省略時は「${template.name}」)`
              : override.length > 480
                ? `root Item タイトル (現在 ${override.length} / 500 文字、上限近接)`
                : `root Item タイトル (現在 ${override.length} / 500 文字)`
          }
        />
      </div>
      {vars.length > 0 ? (
        <div className="space-y-2">
          <div className="text-muted-foreground text-xs">
            変数 ({vars.length}): {'{{'} {'}}'} 記法を title / description / DoD から検出
          </div>
          {vars.map((v) => (
            <div key={v}>
              <Label htmlFor={`var-${template.id}-${v}`}>変数: {v}</Label>
              <IMEInput
                id={`var-${template.id}-${v}`}
                className="h-11"
                value={values[v] ?? ''}
                onChange={(e) => setValues({ ...values, [v]: e.target.value })}
                required
                aria-required="true"
                /* iter1679: Mustache 変数値 input は task title 系 (iter350) と同 hot path、
                   browser autoComplete 候補は無関係なため "off"。 */
                autoComplete="off"
                aria-invalid={
                  ((values[v] ?? '').length > 0 && (values[v] ?? '').trim() === '') || undefined
                }
                // iter1212: 旧 aria-label `Mustache 変数「${v}」 (...)` (全 4 path) は visible
                // Label "変数: {v}" を中位置 "**Mustache** 変数「${v}」 (...)" に持ち voice control
                // prefix-matching「click 変数」 match 不可 (substring 一致のみ)。override-${id}
                // と同 sweep を var-${id}-${v} にも展開。Input は htmlFor Label が visible なので
                // Label text "変数: {v}" を冒頭固定 + em-dash 区切で descriptive 末尾保持。
                aria-label={(() => {
                  const val = values[v] ?? ''
                  if (val.length === 0)
                    return `変数: ${v} — Mustache 変数「${v}」 の値 (必須、最大 500 文字、template の {{${v}}} に展開時 substitute される)`
                  if (val.trim() === '')
                    return `変数: ${v} — Mustache 変数「${v}」 (現在 ${val.length} / 500 文字、空白のみは不正)`
                  if (val.length > 480)
                    return `変数: ${v} — Mustache 変数「${v}」 (現在 ${val.length} / 500 文字、上限近接)`
                  return `変数: ${v} — Mustache 変数「${v}」 (現在 ${val.length} / 500 文字)`
                })()}
                maxLength={500}
                enterKeyHint="next"
              />
            </div>
          ))}
        </div>
      ) : (
        <p
          className="text-muted-foreground text-xs"
          role="status"
          aria-live="polite"
          data-testid={`instantiate-vars-empty-${template.id}`}
        >
          変数なし (そのまま展開)
        </p>
      )}
      {/* iter1098: 旧 aria-label "Template「name」を即実行 (Instantiate)" / "...を展開中…" は
          visible "即実行 (Instantiate)" / "展開中…" を末尾に持ち、voice control prefix-matching
          で「click 即実行」 match 不可。iter1093-1097 sweep convention に合わせ visible 冒頭固定。 */}
      <Button
        type="submit"
        size="sm"
        className="min-h-11"
        disabled={mut.isPending}
        aria-busy={mut.isPending || undefined}
        aria-label={
          mut.isPending
            ? `展開中… — Template「${template.name}」を即実行中`
            : `即実行 (Instantiate) — Template「${template.name}」をワークパッケージとして展開`
        }
      >
        {/* iter1083: visible は ASCII '...' だったが aria-label は U+2026 '…' を使っていて
            literal substring 不一致 = WCAG 2.5.3 違反 + voice control「click 展開中…」 matching 不可。
            iter1078b/1081b/1082 sweep の続き、Unicode '…' に統一して codebase convention と合わせる。 */}
        <span aria-hidden="true">{mut.isPending ? '展開中…' : '即実行 (Instantiate)'}</span>
      </Button>
    </form>
  )
}
