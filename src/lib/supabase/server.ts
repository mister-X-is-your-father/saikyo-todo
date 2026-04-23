/**
 * Server Component / Server Action / Route Handler 用 Supabase クライアント。
 * Cookie 経由でセッションを読む。
 */
import { cookies } from 'next/headers'

import 'server-only'

import { createServerClient } from '@supabase/ssr'

import { env } from '@/env'

export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // RSC 内では set できないことがある (Server Action / Route Handler ではOK)
        }
      },
    },
  })
}
