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

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Workspace 名</Label>
        <IMEInput
          id="name"
          placeholder="例: チーム A"
          required
          aria-required="true"
          minLength={1}
          maxLength={50}
          {...form.register('name')}
        />
        {form.formState.errors.name && (
          <p className="text-destructive text-xs">{form.formState.errors.name.message}</p>
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
          spellCheck={false}
          {...form.register('slug')}
        />
        {form.formState.errors.slug && (
          <p className="text-destructive text-xs">{form.formState.errors.slug.message}</p>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? '作成中...' : '作成'}
      </Button>
    </form>
  )
}
