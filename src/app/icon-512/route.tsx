/**
 * 512x512 maskable PWA アイコン (Lighthouse 監査要件)。
 * App Router の icon.tsx は size 単一なので、512 は別 route で `next/og` 生成。
 * URL: /icon-512
 */
import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    <div
      style={{
        fontSize: 280,
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#f8fafc',
        fontWeight: 800,
        letterSpacing: '-0.04em',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      最
    </div>,
    { width: 512, height: 512 },
  )
}
