/**
 * Next.js middleware から呼ぶ Supabase クライアント。
 * セッション cookie を refresh する標準パターン。
 */
import { type NextRequest, NextResponse } from 'next/server'

import { createServerClient } from '@supabase/ssr'

import { env } from '@/env'

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // ここでセッションを refresh (cookie を最新化)
  await supabase.auth.getUser()

  return supabaseResponse
}
