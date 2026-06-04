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
        {/* iter1096: 旧 aria-label "アカウントをお持ちでない方はこちらでサインアップ" は
            visible "サインアップ" を末尾に持ち、voice control prefix-matching「click サインアップ」
            match 不可。iter1093-1095 sweep convention に合わせ visible 冒頭固定。 */}
        <Link
          href="/signup"
          className="text-primary focus-visible:ring-ring relative z-10 inline-flex min-h-11 items-center rounded px-2 py-2 underline underline-offset-4 focus-visible:ring-2 focus-visible:outline-none"
          data-testid="signup-link"
          aria-label="サインアップ — アカウント未作成の方はこちらから新規登録"
          // iter1803: iter1801 back-link / iter1779 workspace nav と同 pattern を auth cross-link
          // にも展開、auth UX hover disclosure 完備。
          title="サインアップ — アカウント未作成の方はこちらから新規登録"
        >
          <span aria-hidden="true">サインアップ</span>
        </Link>
      </CardFooter>
    </Card>
  )
}
