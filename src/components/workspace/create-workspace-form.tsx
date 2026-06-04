'use client'

import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { useRouter } from 'next/navigation'

import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

import { createWorkspaceAction } from '@/features/workspace/actions'
import { type CreateWorkspaceInput, CreateWorkspaceInputSchema } from '@/features/workspace/schema'

import { IMEInput } from '@/components/shared/ime-input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

export function CreateWorkspaceForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const form = useForm<CreateWorkspaceInput>({
    resolver: zodResolver(CreateWorkspaceInputSchema),
    // iter1700: 他 useForm 系 form 4 件 (login / signup / mock-login / mock-submit) は
    // iter255-379 sweep で `mode: 'onTouched'` 採用済 (blur 時 inline error 表示)。
    // 本 form のみ default 'onSubmit' で取りこぼし、user は submit するまで slug pattern
    // 違反 / name 空欄 error を見られず一発失敗体験 (WCAG 3.3.1 inline error timing と
    // sibling form の UX 整合)。`mode: 'onTouched'` 追加で他 form と pattern 統一。
    mode: 'onTouched',
    defaultValues: { name: '', slug: '' },
  })

  function onSubmit(values: CreateWorkspaceInput) {
    startTransition(async () => {
      const result = await createWorkspaceAction(values)
      if (!result.ok) {
        toast.error(result.error.message)
        return
      }
      toast.success('Workspace を作成しました')
      router.push(`/${result.value.id}`)
      router.refresh()
    })
  }

  function onInvalid(errors: typeof form.formState.errors) {
    const firstError = Object.keys(errors)[0] as keyof CreateWorkspaceInput | undefined
    if (firstError) form.setFocus(firstError)
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit, onInvalid)}
      noValidate
      aria-busy={isPending || undefined}
      aria-label="Workspace 作成フォーム"
      /* iter2217: create-workspace-form の aria-label "Workspace 作成フォーム" は browser
         tooltip にならず sighted は hover で form 用途 disclose 不可。
         workspace-mode-radiogroup iter2215 / item-decompose-btn iter2213 と同
         title=aria-label sync pattern。 */
      title="Workspace 作成フォーム"
      data-testid="create-workspace-form"
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="name">Workspace 名</Label>
        <IMEInput
          id="name"
          className="h-11"
          placeholder="例: チーム A"
          required
          aria-required="true"
          minLength={1}
          maxLength={50}
          // iter343: 既存の Workspace 名候補を browser auto-fill が誤候補で上書きしないよう off
          // (Workspace 名は each user 固有で auto-fill 候補に意味がない、空欄で誤候補が出るのは UX 阻害)。
          autoComplete="off"
          enterKeyHint="next"
          aria-invalid={form.formState.errors.name ? true : undefined}
          aria-describedby={
            form.formState.errors.name ? 'ws-name-hint ws-name-error' : 'ws-name-hint'
          }
          {...form.register('name')}
        />
        {/* iter949: form hint pattern (iter735-741 sweep) を ws-name にも適用。
            隣接 slug 側 (ws-slug-hint) と同 a11y structure に揃え、name の 50 文字上限と用途を提示。 */}
        <p id="ws-name-hint" className="text-muted-foreground text-xs">
          チームメンバーに表示される Workspace 名。最大 50 文字。例: チーム A
        </p>
        {form.formState.errors.name && (
          <p id="ws-name-error" className="text-destructive text-xs" role="alert">
            {form.formState.errors.name.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="slug">URL slug</Label>
        <IMEInput
          id="slug"
          className="h-11"
          placeholder="team-a"
          required
          aria-required="true"
          pattern="^[a-z0-9-]+$"
          minLength={1}
          maxLength={50}
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="send"
          aria-invalid={form.formState.errors.slug ? true : undefined}
          aria-describedby={
            form.formState.errors.slug ? 'ws-slug-hint ws-slug-error' : 'ws-slug-hint'
          }
          {...form.register('slug')}
        />
        <p id="ws-slug-hint" className="text-muted-foreground text-xs">
          小文字 (a-z) / 数字 / ハイフンのみ。最大 50 文字。例: team-a
        </p>
        {form.formState.errors.slug && (
          <p id="ws-slug-error" className="text-destructive text-xs" role="alert">
            {form.formState.errors.slug.message}
          </p>
        )}
      </div>
      {/* iter1097: 旧 aria-label "Workspace を新規作成" / "Workspace を作成中…" は visible
          "作成" / "作成中…" を末尾に持ち、voice control prefix-matching で「click 作成」 match 不可。
          iter1093-1096 sweep convention に合わせ visible 冒頭固定。 */}
      <Button
        type="submit"
        className="h-11 w-full"
        disabled={isPending}
        aria-busy={isPending || undefined}
        data-testid="create-workspace-submit"
        aria-label={isPending ? '作成中… — Workspace を作成中' : '作成 — Workspace を新規作成'}
        // iter1799: iter1795-1797 auth/mock-timesheet submit と同 pattern を
        // create-workspace submit にも展開、creation UX sighted hover disclosure。
        title={isPending ? '作成中… — Workspace を作成中' : '作成 — Workspace を新規作成'}
      >
        {/* iter1082: visible は ASCII '...' だったが aria-label は U+2026 '…' を使っていて
            literal substring 不一致 = WCAG 2.5.3 違反 + voice control「click 作成中…」 matching 不可。
            iter1078b mock-login / iter1081b mock-submit の同 pattern fix を create-workspace-form
            にも展開、Unicode '…' に統一して codebase convention と合わせる。 */}
        <span aria-hidden="true">{isPending ? '作成中…' : '作成'}</span>
      </Button>
    </form>
  )
}
