import { z } from 'zod'

export const SignupInputSchema = z.object({
  email: z.string().trim().email('正しいメールアドレスを入力してください'),
  password: z.string().min(8, 'パスワードは 8 文字以上で入力してください'),
  displayName: z
    .string()
    .trim()
    .min(1, '表示名を入力してください')
    .max(50, '表示名は 50 文字以内で入力してください'),
})
export type SignupInput = z.infer<typeof SignupInputSchema>

export const LoginInputSchema = z.object({
  email: z.string().trim().email('正しいメールアドレスを入力してください'),
  password: z.string().min(1, 'パスワードを入力してください'),
})
export type LoginInput = z.infer<typeof LoginInputSchema>
