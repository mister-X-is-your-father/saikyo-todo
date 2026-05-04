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
      data-testid="create-workspace-form"
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="name">Workspace 名</Label>
        <IMEInput
          id="name"
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
          aria-describedby={form.formState.errors.name ? 'ws-name-error' : undefined}
          {...form.register('name')}
        />
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
      <Button
        type="submit"
        className="h-11 w-full"
        disabled={isPending}
        aria-busy={isPending || undefined}
        data-testid="create-workspace-submit"
        aria-label={isPending ? 'Workspace を作成中…' : 'Workspace を新規作成'}
      >
        {isPending ? '作成中...' : '作成'}
      </Button>
    </form>
  )
}
