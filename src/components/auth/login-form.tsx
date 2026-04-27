'use client'

import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { useRouter } from 'next/navigation'

import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

import { loginAction } from '@/features/auth/actions'
import { type LoginInput, LoginInputSchema } from '@/features/auth/schema'

import { IMEInput } from '@/components/shared/ime-input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

export function LoginForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const form = useForm<LoginInput>({
    resolver: zodResolver(LoginInputSchema),
    defaultValues: { email: '', password: '' },
  })

  function onSubmit(values: LoginInput) {
    startTransition(async () => {
      const result = await loginAction(values)
      if (!result.ok) {
        toast.error(result.error.message)
        return
      }
      toast.success('ログインしました')
      router.push('/')
      router.refresh()
    })
  }

  return (
    <form method="post" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
          <p className="text-destructive text-xs" role="alert">
            {form.formState.errors.email.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">パスワード</Label>
        <IMEInput
          id="password"
          type="password"
          autoComplete="current-password"
          required
          aria-required="true"
          minLength={8}
          {...form.register('password')}
        />
        {form.formState.errors.password && (
          <p className="text-destructive text-xs" role="alert">
            {form.formState.errors.password.message}
          </p>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'ログイン中...' : 'ログイン'}
      </Button>
    </form>
  )
}
