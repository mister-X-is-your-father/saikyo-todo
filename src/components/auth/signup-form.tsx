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
        const target = result.error.message.includes('パスワード') ? 'password' : 'email'
        form.setFocus(target)
        return
      }
      toast.success('サインアップ完了。Workspace を作りましょう')
      router.push('/')
      router.refresh()
    })
  }

  function onInvalid(errors: typeof form.formState.errors) {
    const firstError = Object.keys(errors)[0] as keyof SignupInput | undefined
    if (firstError) form.setFocus(firstError)
  }

  return (
    <form
      method="post"
      onSubmit={form.handleSubmit(onSubmit, onInvalid)}
      aria-labelledby="signup-heading"
      aria-describedby="signup-description"
      aria-busy={isPending || undefined}
      noValidate
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="displayName">表示名</Label>
        <IMEInput
          id="displayName"
          className="h-11"
          autoComplete="name"
          enterKeyHint="next"
          autoFocus
          required
          aria-required="true"
          minLength={1}
          maxLength={50}
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={form.formState.errors.displayName ? true : undefined}
          aria-describedby={
            form.formState.errors.displayName
              ? 'displayName-hint displayName-error'
              : 'displayName-hint'
          }
          {...form.register('displayName')}
        />
        {/* iter735: pattern エラー前に format hint を出す (create-workspace-form
            slug iter733 と同 pattern)。SR は input focus 時に hint も読む。 */}
        <p id="displayName-hint" className="text-muted-foreground text-xs">
          チームメンバーに表示される名前。最大 50 文字。
        </p>
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
          className="h-11"
          autoComplete="email"
          inputMode="email"
          enterKeyHint="next"
          autoCorrect="off"
          spellCheck={false}
          autoCapitalize="none"
          required
          aria-required="true"
          aria-invalid={form.formState.errors.email ? true : undefined}
          aria-describedby={
            form.formState.errors.email
              ? 'signup-email-hint signup-email-error'
              : 'signup-email-hint'
          }
          {...form.register('email')}
        />
        <p id="signup-email-hint" className="text-muted-foreground text-xs">
          ログイン時の ID として使用します。例: you@example.com
        </p>
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
          className="h-11"
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
      {/* iter1093: 既存 aria-label は visible label を末尾 () 内に持っていたため、
          voice control「click サインアップ」 が prefix-matching engine で match 不可。
          iter1034-1077 visible-prefix sweep の convention に合わせ visible を冒頭固定。
          iter1490: pending 側に () 区切が残っていた (iter1144 mock-login sweep と divergence)
          ため em-dash + 短い descriptive に揃え、login pending pattern と統一。 */}
      <Button
        type="submit"
        className="h-11 w-full"
        disabled={isPending}
        aria-busy={isPending || undefined}
        data-testid="signup-submit"
        aria-label={
          isPending ? '作成中… — サインアップ処理を実行中' : 'サインアップ — アカウントを作成'
        }
      >
        <span aria-hidden="true">{isPending ? '作成中…' : 'サインアップ'}</span>
      </Button>
    </form>
  )
}
