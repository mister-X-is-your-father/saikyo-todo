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
    mode: 'onTouched',
    defaultValues: { email: '', password: '', displayName: '' },
  })

  function onSubmit(values: SignupInput) {
    startTransition(async () => {
      const result = await signupAction(values)
      if (!result.ok) {
        toast.error(result.error.message)
        form.setFocus('email')
        return
      }
      toast.success('サインアップ完了。Workspace を作りましょう')
      router.push('/')
      router.refresh()
    })
  }

  return (
    <form
      method="post"
      onSubmit={form.handleSubmit(onSubmit)}
      aria-labelledby="signup-heading"
      aria-busy={isPending || undefined}
      noValidate
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="displayName">表示名</Label>
        <IMEInput
          id="displayName"
          autoComplete="name"
          autoFocus
          required
          aria-required="true"
          minLength={1}
          maxLength={50}
          spellCheck={false}
          aria-invalid={form.formState.errors.displayName ? true : undefined}
          aria-describedby={form.formState.errors.displayName ? 'displayName-error' : undefined}
          {...form.register('displayName')}
        />
        {form.formState.errors.displayName && (
          <p id="displayName-error" className="text-destructive text-xs" role="alert">
            {form.formState.errors.displayName.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">メールアドレス</Label>
        <IMEInput
          id="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          spellCheck={false}
          autoCapitalize="none"
          required
          aria-required="true"
          aria-invalid={form.formState.errors.email ? true : undefined}
          aria-describedby={form.formState.errors.email ? 'signup-email-error' : undefined}
          {...form.register('email')}
        />
        {form.formState.errors.email && (
          <p id="signup-email-error" className="text-destructive text-xs" role="alert">
            {form.formState.errors.email.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">パスワード</Label>
        <IMEInput
          id="password"
          type="password"
          autoComplete="new-password"
          enterKeyHint="send"
          required
          aria-required="true"
          minLength={8}
          aria-invalid={form.formState.errors.password ? true : undefined}
          aria-describedby={
            form.formState.errors.password
              ? 'signup-password-hint signup-password-error'
              : 'signup-password-hint'
          }
          {...form.register('password')}
        />
        <p id="signup-password-hint" className="text-muted-foreground text-xs">
          8 文字以上
        </p>
        {form.formState.errors.password && (
          <p id="signup-password-error" className="text-destructive text-xs" role="alert">
            {form.formState.errors.password.message}
          </p>
        )}
      </div>
      <Button
        type="submit"
        className="w-full"
        disabled={isPending}
        aria-label={isPending ? 'アカウント作成中…' : 'アカウントを作成 (サインアップ)'}
      >
        {isPending ? '作成中…' : 'サインアップ'}
      </Button>
    </form>
  )
}
