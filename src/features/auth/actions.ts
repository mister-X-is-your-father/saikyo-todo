'use server'

import { AuthError, ExternalServiceError, ValidationError } from '@/lib/errors'
import { err, ok, type Result } from '@/lib/result'
import { createSupabaseServerClient } from '@/lib/supabase/server'

import { LoginInputSchema, SignupInputSchema } from './schema'

/** 代表的な Supabase Auth error message を日本語表示に変換 (toast に Japanese を出す)。 */
function mapAuthError(msg: string): string {
  if (/Invalid login credentials/i.test(msg))
    return 'メールアドレスまたはパスワードが正しくありません'
  if (/User already registered/i.test(msg)) return 'このメールアドレスは既に登録されています'
  if (/Email rate limit exceeded|over_email_send_rate_limit/i.test(msg))
    return '短時間に多くの試行がありました。しばらく時間をおいて再度お試しください'
  if (/Email not confirmed/i.test(msg))
    return 'メールアドレスの確認が完了していません。受信箱を確認してください'
  if (/Password should be at least/i.test(msg)) return 'パスワードは 8 文字以上で設定してください'
  return msg
}

export async function signupAction(input: unknown): Promise<Result<{ userId: string }>> {
  const parsed = SignupInputSchema.safeParse(input)
  if (!parsed.success) return err(new ValidationError('入力内容を確認してください', parsed.error))

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.displayName },
    },
  })
  if (error) return err(new ExternalServiceError('Supabase Auth', mapAuthError(error.message)))
  if (!data.user) return err(new AuthError('サインアップに失敗しました'))
  return ok({ userId: data.user.id })
}

export async function loginAction(input: unknown): Promise<Result<{ userId: string }>> {
  const parsed = LoginInputSchema.safeParse(input)
  if (!parsed.success) return err(new ValidationError('入力内容を確認してください', parsed.error))

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })
  if (error) return err(new AuthError(mapAuthError(error.message)))
  if (!data.user) return err(new AuthError('ログインに失敗しました'))
  return ok({ userId: data.user.id })
}

export async function logoutAction(): Promise<Result<void>> {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signOut()
  if (error) return err(new ExternalServiceError('Supabase Auth', error.message))
  return ok(undefined)
}
