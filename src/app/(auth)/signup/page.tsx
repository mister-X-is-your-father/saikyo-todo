import type { Metadata } from 'next'
import Link from 'next/link'

import { SignupForm } from '@/components/auth/signup-form'
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'サインアップ | 最強TODO',
}

export default function SignupPage() {
  return (
    <Card>
      <CardHeader>
        <h1 id="signup-heading" className="font-heading text-2xl leading-snug font-medium">
          サインアップ
        </h1>
        <CardDescription>アカウントを作成して始めましょう</CardDescription>
      </CardHeader>
      <CardContent>
        <SignupForm />
      </CardContent>
      <CardFooter className="relative z-10 flex justify-between text-sm">
        <span className="text-muted-foreground">アカウントあり?</span>
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
