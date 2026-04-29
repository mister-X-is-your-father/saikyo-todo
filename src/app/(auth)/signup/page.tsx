import type { Metadata } from 'next'
import Link from 'next/link'

import { SignupForm } from '@/components/auth/signup-form'
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'サインアップ | 最強TODO',
  description:
    '最強TODO のサインアップ画面。新規アカウント作成 (表示名 + メールアドレス + 8文字以上のパスワード)。',
  robots: { index: false, follow: false },
}

export default function SignupPage() {
  return (
    <Card>
      <CardHeader>
        <h1 id="signup-heading" className="font-heading text-2xl leading-snug font-medium">
          サインアップ
        </h1>
        <CardDescription id="signup-description">アカウントを作成して始めましょう</CardDescription>
      </CardHeader>
      <CardContent>
        <SignupForm />
      </CardContent>
      <CardFooter className="relative z-10 flex justify-between text-sm">
        <span aria-hidden="true" className="text-muted-foreground">
          アカウントあり?
        </span>
        <Link
          href="/login"
          className="text-primary relative z-10 inline-flex items-center py-2 underline underline-offset-4"
          aria-label="既にアカウントをお持ちの方はこちらでログイン"
        >
          ログイン
        </Link>
      </CardFooter>
    </Card>
  )
}
