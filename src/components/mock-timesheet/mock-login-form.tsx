'use client'

import { useTransition } from 'react'
import { useForm } from 'react-hook-form'

import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

import { mockLoginAction } from '@/features/mock-timesheet/actions'
import {
  type MockTimesheetLoginInput,
  MockTimesheetLoginInputSchema,
} from '@/features/mock-timesheet/schema'

import { IMEInput } from '@/components/shared/ime-input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

export function MockLoginForm() {
  const [isPending, startTransition] = useTransition()
  const form = useForm<MockTimesheetLoginInput>({
    resolver: zodResolver(MockTimesheetLoginInputSchema),
    mode: 'onTouched',
    defaultValues: { email: '', password: '' },
  })

  function onSubmit(values: MockTimesheetLoginInput) {
    startTransition(async () => {
      const r = await mockLoginAction(values)
      if (r && !r.ok) toast.error(r.error.message)
      // 成功時 server-side で redirect されるので client に戻らない
    })
  }

  function onInvalid(errors: typeof form.formState.errors) {
    const firstError = Object.keys(errors)[0] as keyof MockTimesheetLoginInput | undefined
    if (firstError) form.setFocus(firstError)
  }

  return (
    <form
      method="post"
      onSubmit={form.handleSubmit(onSubmit, onInvalid)}
      aria-label="Mock Timesheet ログインフォーム"
      aria-busy={isPending || undefined}
      noValidate
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="tsEmail">メールアドレス</Label>
        <IMEInput
          id="tsEmail"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          required
          aria-required="true"
          aria-invalid={form.formState.errors.email ? true : undefined}
          aria-describedby={
            form.formState.errors.email ? 'tsEmail-hint tsEmail-error' : 'tsEmail-hint'
          }
          {...form.register('email')}
        />
        {/* iter738: signup-form / login-form (iter735race-737race) と同 form hint pattern。
            mock-timesheet は demo 用途で開発者がよく触るので hint を見える化。 */}
        <p id="tsEmail-hint" className="text-muted-foreground text-xs">
          mock-timesheet 用 email。例: ops@example.com (フォーム下の seed 参照)
        </p>
        {form.formState.errors.email && (
          <p id="tsEmail-error" className="text-destructive text-xs" role="alert">
            {form.formState.errors.email.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="tsPassword">パスワード</Label>
        <IMEInput
          id="tsPassword"
          type="password"
          autoComplete="current-password"
          required
          aria-required="true"
          aria-invalid={form.formState.errors.password ? true : undefined}
          aria-describedby={
            form.formState.errors.password ? 'tsPassword-hint tsPassword-error' : 'tsPassword-hint'
          }
          {...form.register('password')}
        />
        {/* iter888: tsEmail-hint と同 pattern。seed password (form 下に表示済) を
            hint で誘導し、自動入力テスト用 mock の趣旨を SR / 視覚双方で明示。 */}
        <p id="tsPassword-hint" className="text-muted-foreground text-xs">
          mock-timesheet 用パスワード (フォーム下の seed 参照: password1234)。
        </p>
        {form.formState.errors.password && (
          <p id="tsPassword-error" className="text-destructive text-xs" role="alert">
            {form.formState.errors.password.message}
          </p>
        )}
      </div>
      <Button
        id="tsLoginSubmit"
        type="submit"
        className="h-11 w-full"
        disabled={isPending}
        aria-busy={isPending || undefined}
        aria-label={
          isPending
            ? '認証中… (mock-timesheet 認証処理を実行中)'
            : 'ログイン (mock-timesheet email + password で認証)'
        }
      >
        <span aria-hidden="true">{isPending ? '認証中…' : 'ログイン'}</span>
      </Button>
      <p className="text-muted-foreground text-xs">
        開発用: <code>ops@example.com</code> / <code>password1234</code>
      </p>
    </form>
  )
}
