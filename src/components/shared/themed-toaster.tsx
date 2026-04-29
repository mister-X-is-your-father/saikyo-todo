'use client'

import { useTheme } from 'next-themes'

import { Toaster, type ToasterProps } from 'sonner'

/**
 * sonner Toaster を next-themes の `resolvedTheme` に同期させる client wrapper。
 *
 * 直接 `<Toaster theme="system" />` だと sonner が prefers-color-scheme を
 * 直接 query するため、user が in-app theme toggle で system 設定を
 * override した場合に ThemeProvider と乖離する (system=light、user 選択=dark
 * で toast だけ light のまま等)。本 wrapper は next-themes の resolvedTheme
 * を取って Toaster に伝搬し、in-app theme と完全同期。
 */
export function ThemedToaster(props: Omit<ToasterProps, 'theme'>) {
  const { resolvedTheme } = useTheme()
  const theme: ToasterProps['theme'] =
    resolvedTheme === 'dark' || resolvedTheme === 'light' ? resolvedTheme : 'system'
  return <Toaster theme={theme} {...props} />
}
