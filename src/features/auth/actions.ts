'use server'

import { AuthError, ExternalServiceError, ValidationError } from '@/lib/errors'
import { err, ok, type Result } from '@/lib/result'
import { createSupabaseServerClient } from '@/lib/supabase/server'

import { LoginInputSchema, SignupInputSchema } from './schema'

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
  if (error) return err(new ExternalServiceError('Supabase Auth', error.message))
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
  if (error) return err(new AuthError(error.message))
  if (!data.user) return err(new AuthError('ログインに失敗しました'))
  return ok({ userId: data.user.id })
}

export async function logoutAction(): Promise<Result<void>> {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signOut()
  if (error) return err(new ExternalServiceError('Supabase Auth', error.message))
  return ok(undefined)
}
