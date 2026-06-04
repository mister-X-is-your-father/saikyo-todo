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
      /* iter1603: 旧 aria-label `'ライトテーマに切替'` / `'ダークテーマに切替'` は ' に' 助詞接続で
         iter1093-1602 sweep の em-dash 区切と divergent。両 path で em-dash 区切に統一。 */
      aria-label={
        resolvedTheme === 'dark' ? 'ライトテーマ — クリックで切替' : 'ダークテーマ — クリックで切替'
      }
      aria-pressed={resolvedTheme === 'dark'}
      className="min-h-11 min-w-11"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      data-testid="theme-toggle"
      // iter1763: aria-label は brower tooltip にならないため、icon-only button (Sun/Moon
      // 切替) で sighted hover 時に何をする button か即把握できなかった。title 付与で
      // sighted hover → 「ライトテーマに切替」「ダークテーマに切替」 disclose、
      // aria-label と同 text で SR ↔ sighted 同期。
      title={resolvedTheme === 'dark' ? 'ライトテーマに切替' : 'ダークテーマに切替'}
    >
      <Sun className="h-4 w-4 dark:hidden" aria-hidden="true" />
      <Moon className="hidden h-4 w-4 dark:block" aria-hidden="true" />
    </Button>
  )
}
