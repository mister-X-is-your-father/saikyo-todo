import type { NextRequest } from 'next/server'

import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * 以下を除く全パスに適用:
     * - _next/static / _next/image (Next.js 静的)
     * - 画像 (favicon.ico, .svg, .png 等)
     * - api/health 等 (将来必要なら)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
