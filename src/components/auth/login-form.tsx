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
    mode: 'onTouched',
    defaultValues: { email: '', password: '' },
  })

  function onSubmit(values: LoginInput) {
    startTransition(async () => {
      const result = await loginAction(values)
      if (!result.ok) {
        toast.error(result.error.message)
        form.setFocus('password')
        return
      }
      toast.success('ログインしました')
      router.push('/')
      router.refresh()
    })
  }

  function onInvalid(errors: typeof form.formState.errors) {
    const firstError = Object.keys(errors)[0] as keyof LoginInput | undefined
    if (firstError) form.setFocus(firstError)
  }

  return (
    <form
      method="post"
      onSubmit={form.handleSubmit(onSubmit, onInvalid)}
      aria-labelledby="login-heading"
      aria-describedby="login-description"
      aria-busy={isPending || undefined}
      noValidate
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="email">メールアドレス</Label>
        <IMEInput
          id="email"
          type="email"
          className="h-11"
          autoComplete="email"
          inputMode="email"
          enterKeyHint="next"
          autoCorrect="off"
          spellCheck={false}
          autoCapitalize="none"
          autoFocus
          required
          aria-required="true"
          aria-invalid={form.formState.errors.email ? true : undefined}
          aria-describedby={
            form.formState.errors.email ? 'login-email-hint email-error' : 'login-email-hint'
          }
          {...form.register('email')}
        />
        <p id="login-email-hint" className="text-muted-foreground text-xs">
          サインアップ時に登録したメールアドレス。例: you@example.com
        </p>
        {form.formState.errors.email && (
          <p id="email-error" className="text-destructive text-xs" role="alert">
            {form.formState.errors.email.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">パスワード</Label>
        <IMEInput
          id="password"
          type="password"
          className="h-11"
          autoComplete="current-password"
          enterKeyHint="send"
          required
          aria-required="true"
          aria-invalid={form.formState.errors.password ? true : undefined}
          aria-describedby={
            form.formState.errors.password
              ? 'login-password-hint password-error'
              : 'login-password-hint'
          }
          {...form.register('password')}
        />
        {/* iter741: form hint pattern (iter733race-740race と同じ) を login password にも適用。
            signup-form 側 (signup-password-hint) と意図的に文言を分け、login は「設定済」 の
            mental model を伝える。 */}
        <p id="login-password-hint" className="text-muted-foreground text-xs">
          サインアップ時に設定したパスワード (8 文字以上)。忘れた場合は再サインアップ。
        </p>
        {form.formState.errors.password && (
          <p id="password-error" className="text-destructive text-xs" role="alert">
            {form.formState.errors.password.message}
          </p>
        )}
      </div>
      {/* iter1143: signup-form (iter1093) と em-dash 区切 visible-prefix convention
          を統一。旧 () 区切は prefix-match 自体は満たすが、iter1093-1124 sweep の
          em-dash style と divergence していたため統一。visible span は無変更。 */}
      <Button
        type="submit"
        className="h-11 w-full"
        disabled={isPending}
        aria-busy={isPending || undefined}
        data-testid="login-submit"
        aria-label={
          isPending ? 'ログイン中… — 認証処理を実行中' : 'ログイン — メール + パスワードで認証'
        }
      >
        <span aria-hidden="true">{isPending ? 'ログイン中…' : 'ログイン'}</span>
      </Button>
    </form>
  )
}
