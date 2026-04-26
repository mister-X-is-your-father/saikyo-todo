'use client'

import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { useRouter } from 'next/navigation'

import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

import { signupAction } from '@/features/auth/actions'
import { type SignupInput, SignupInputSchema } from '@/features/auth/schema'

import { IMEInput } from '@/components/shared/ime-input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

export function SignupForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const form = useForm<SignupInput>({
    resolver: zodResolver(SignupInputSchema),
    defaultValues: { email: '', password: '', displayName: '' },
  })

  function onSubmit(values: SignupInput) {
    startTransition(async () => {
      const result = await signupAction(values)
      if (!result.ok) {
        toast.error(result.error.message)
        return
      }
      toast.success('サインアップ完了。Workspace を作りましょう')
      router.push('/')
      router.refresh()
    })
  }

  return (
    <form method="post" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="displayName">表示名</Label>
        <IMEInput
          id="displayName"
          autoComplete="name"
          required
          aria-required="true"
          minLength={1}
          {...form.register('displayName')}
        />
        {form.formState.errors.displayName && (
          <p className="text-destructive text-xs">{form.formState.errors.displayName.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">メールアドレス</Label>
        <IMEInput
          id="email"
          type="email"
          autoComplete="email"
          required
          aria-required="true"
          {...form.register('email')}
        />
        {form.formState.errors.email && (
          <p className="text-destructive text-xs">{form.formState.errors.email.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">パスワード (8 文字以上)</Label>
        <IMEInput
          id="password"
          type="password"
          autoComplete="new-password"
          required
          aria-required="true"
          minLength={8}
          {...form.register('password')}
        />
        {form.formState.errors.password && (
          <p className="text-destructive text-xs">{form.formState.errors.password.message}</p>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? '作成中...' : 'サインアップ'}
      </Button>
    </form>
  )
}
