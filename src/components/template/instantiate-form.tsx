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

  return (
    <form
      className="space-y-3 rounded-md border p-3"
      data-testid="instantiate-form"
      onSubmit={(e) => {
        e.preventDefault()
        void handleInstantiate()
      }}
    >
      <div className="text-sm font-medium">この Template を展開</div>
      <div>
        <Label htmlFor={`override-${template.id}`}>root Item タイトル (任意)</Label>
        <IMEInput
          id={`override-${template.id}`}
          placeholder={template.name}
          value={override}
          onChange={(e) => setOverride(e.target.value)}
        />
      </div>
      {vars.length > 0 ? (
        <div className="space-y-2">
          <div className="text-muted-foreground text-xs">
            変数 ({vars.length}): {'{{'} {'}}'} 記法を title / description / DoD から検出
          </div>
          {vars.map((v) => (
            <div key={v}>
              <Label htmlFor={`var-${template.id}-${v}`}>{v}</Label>
              <IMEInput
                id={`var-${template.id}-${v}`}
                value={values[v] ?? ''}
                onChange={(e) => setValues({ ...values, [v]: e.target.value })}
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">変数なし (そのまま展開)</p>
      )}
      <Button type="submit" size="sm" disabled={mut.isPending}>
        {mut.isPending ? '展開中...' : '即実行 (Instantiate)'}
      </Button>
    </form>
  )
}
