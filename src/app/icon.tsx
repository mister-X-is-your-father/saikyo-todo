/**
 * App Router 動的アイコン (Phase 6.11 PWA)。
 * `next/og` でランタイム生成。192x192 を 1 枚返し、Lighthouse PWA 監査の
 * "icons" check + apple-touch-icon を兼ねる (size 違いは別ファイル)。
 */
import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 192, height: 192 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        fontSize: 132,
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
        borderRadius: 32,
      }}
    >
      最
    </div>,
    { ...size },
  )
}
