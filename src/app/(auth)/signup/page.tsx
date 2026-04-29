import type { Metadata } from 'next'
import Link from 'next/link'

import { SignupForm } from '@/components/auth/signup-form'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'サインアップ | 最強TODO',
}

export default function SignupPage() {
  return (
    <Card aria-labelledby="signup-heading" aria-describedby="signup-description">
      <CardHeader>
        <CardTitle id="signup-heading" role="heading" aria-level={1} className="text-2xl">
          サインアップ
        </CardTitle>
        <CardDescription id="signup-description">アカウントを作成して始めましょう</CardDescription>
      </CardHeader>
      <CardContent>
        <SignupForm />
      </CardContent>
      <CardFooter className="relative z-10 flex justify-between text-sm">
        <span className="text-muted-foreground">アカウントあり?</span>
        <Link
          href="/login"
          className="text-primary relative z-10 underline-offset-4 hover:underline"
          aria-label="既にアカウントをお持ちの方はこちらでログイン"
        >
          ログイン
        </Link>
      </CardFooter>
    </Card>
  )
}
