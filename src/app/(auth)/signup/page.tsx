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

export default function SignupPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">サインアップ</CardTitle>
        <CardDescription>アカウントを作成して始めましょう</CardDescription>
      </CardHeader>
      <CardContent>
        <SignupForm />
      </CardContent>
      <CardFooter className="flex justify-between text-sm">
        <span className="text-muted-foreground">アカウントあり?</span>
        <Link href="/login" className="text-primary underline-offset-4 hover:underline">
          ログイン
        </Link>
      </CardFooter>
    </Card>
  )
}
