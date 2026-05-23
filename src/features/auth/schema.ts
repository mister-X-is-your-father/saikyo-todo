import { z } from 'zod'

// iter1154: SignupInput.password 旧 message "パスワードは 8 文字以上" は他 schema の
// "...で入力してください" pattern と不整合 (語尾が体言止め)。iter1086/1092/1126-1153
// 全 schema 文末 "入力してください" 統一の最終調整。
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
