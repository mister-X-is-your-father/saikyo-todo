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
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">ログイン</CardTitle>
        <CardDescription>最強TODO へようこそ</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm />
      </CardContent>
      <CardFooter className="flex justify-between text-sm">
        <span className="text-muted-foreground">アカウント未作成?</span>
        <Link href="/signup" className="text-primary underline-offset-4 hover:underline">
          サインアップ
        </Link>
      </CardFooter>
    </Card>
  )
}
