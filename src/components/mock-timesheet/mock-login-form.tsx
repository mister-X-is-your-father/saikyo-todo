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
      noValidate
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="tsEmail">メールアドレス</Label>
        <IMEInput
          id="tsEmail"
          type="email"
          autoComplete="email"
          aria-invalid={form.formState.errors.email ? true : undefined}
          aria-describedby={form.formState.errors.email ? 'tsEmail-error' : undefined}
          {...form.register('email')}
        />
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
        className="w-full"
        disabled={isPending}
        aria-label={isPending ? '認証中… (mock-timesheet 認証処理を実行中)' : undefined}
      >
        {isPending ? '認証中...' : 'ログイン'}
      </Button>
      <p className="text-muted-foreground text-xs">
        開発用: <code>ops@example.com</code> / <code>password1234</code>
      </p>
    </form>
  )
}
