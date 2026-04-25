'use client'

import { useTheme } from 'next-themes'

import { Moon, Sun } from 'lucide-react'

import { Button } from '@/components/ui/button'

/**
 * テーマ切替ボタン。アイコン切替は CSS (dark: variant) に任せて
 * `mounted` フラグや setState を使わず hydration mismatch を避ける。
 * (next-themes は html に `.dark` を inline script で SSR 前に付ける)
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="テーマ切替"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      data-testid="theme-toggle"
    >
      <Sun className="h-4 w-4 dark:hidden" />
      <Moon className="hidden h-4 w-4 dark:block" />
    </Button>
  )
}
