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
    defaultValues: { email: '', password: '' },
  })

  function onSubmit(values: MockTimesheetLoginInput) {
    startTransition(async () => {
      const r = await mockLoginAction(values)
      if (r && !r.ok) toast.error(r.error.message)
      // 成功時 server-side で redirect されるので client に戻らない
    })
  }

  return (
    <form method="post" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="tsEmail">メールアドレス</Label>
        <IMEInput id="tsEmail" type="email" autoComplete="email" {...form.register('email')} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="tsPassword">パスワード</Label>
        <IMEInput
          id="tsPassword"
          type="password"
          autoComplete="current-password"
          {...form.register('password')}
        />
      </div>
      <Button id="tsLoginSubmit" type="submit" className="w-full" disabled={isPending}>
        {isPending ? '認証中...' : 'ログイン'}
      </Button>
      <p className="text-muted-foreground text-xs">
        開発用: <code>ops@example.com</code> / <code>password1234</code>
      </p>
    </form>
  )
}
