import type { Metadata } from 'next'
import Link from 'next/link'

import { LoginForm } from '@/components/auth/login-form'
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'ログイン | 最強TODO',
  description: '最強TODO のログイン画面。メールアドレスとパスワードでサインイン。',
}

export default function LoginPage() {
  return (
    <Card>
      <CardHeader>
        <h1 id="login-heading" className="font-heading text-2xl leading-snug font-medium">
          ログイン
        </h1>
        <CardDescription id="login-description">最強TODO へようこそ</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm />
      </CardContent>
      <CardFooter className="relative z-10 flex justify-between text-sm">
        <span aria-hidden="true" className="text-muted-foreground">
          アカウント未作成?
        </span>
        <Link
          href="/signup"
          className="text-primary focus-visible:ring-ring relative z-10 inline-flex min-h-11 items-center rounded px-2 py-2 underline underline-offset-4 focus-visible:ring-2 focus-visible:outline-none"
          data-testid="signup-link"
          aria-label="アカウントをお持ちでない方はこちらでサインアップ"
        >
          サインアップ
        </Link>
      </CardFooter>
    </Card>
  )
}
