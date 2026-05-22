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
      aria-describedby="mock-timesheet-description"
      aria-busy={isPending || undefined}
      noValidate
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="tsEmail">メールアドレス</Label>
        <IMEInput
          id="tsEmail"
          type="email"
          className="h-11"
          autoComplete="email"
          inputMode="email"
          enterKeyHint="next"
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
          className="h-11"
          autoComplete="current-password"
          enterKeyHint="send"
          required
          aria-required="true"
          aria-invalid={form.formState.errors.password ? true : undefined}
          aria-describedby={form.formState.errors.password ? 'tsPassword-error' : undefined}
          {...form.register('password')}
        />
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
        {/* iter1078: visible は ASCII '...' だったが aria-label は U+2026 '…' を使っていて
            literal substring 不一致 = WCAG 2.5.3 違反 + voice control「click 認証中…」 matching 不可。
            login-form / signup-form の convention (Unicode '…') に合わせ統一。 */}
        <span aria-hidden="true">{isPending ? '認証中…' : 'ログイン'}</span>
      </Button>
      <p className="text-muted-foreground text-xs">
        開発用: <code>ops@example.com</code> / <code>password1234</code>
      </p>
    </form>
  )
}
