import Link from 'next/link'

import { LoginForm } from '@/components/auth/login-form'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function LoginPage() {
  return (
    <Card role="region" aria-labelledby="login-heading">
      <CardHeader>
        <CardTitle id="login-heading" role="heading" aria-level={1} className="text-2xl">
          ログイン
        </CardTitle>
        <CardDescription>最強TODO へようこそ</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm />
      </CardContent>
      <CardFooter className="relative z-10 flex justify-between text-sm">
        <span className="text-muted-foreground">アカウント未作成?</span>
        <Link
          href="/signup"
          className="text-primary relative z-10 underline-offset-4 hover:underline"
          data-testid="signup-link"
        >
          サインアップ
        </Link>
      </CardFooter>
    </Card>
  )
}
