/**
 * IME (日本語入力) 確定中の Enter キーで form submit されないようにする Input wrapper。
 * shadcn Input をそのまま継承しつつ composition イベントを処理する。
 */
'use client'

import * as React from 'react'

import { Input } from '@/components/ui/input'

export const IMEInput = React.forwardRef<HTMLInputElement, React.ComponentProps<typeof Input>>(
  function IMEInput({ onKeyDown, onCompositionStart, onCompositionEnd, ...props }, ref) {
    const composingRef = React.useRef(false)
    return (
      <Input
        ref={ref}
        onCompositionStart={(e) => {
          composingRef.current = true
          onCompositionStart?.(e)
        }}
        onCompositionEnd={(e) => {
          composingRef.current = false
          onCompositionEnd?.(e)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && composingRef.current) {
            e.stopPropagation()
            return
          }
          onKeyDown?.(e)
        }}
        {...props}
      />
    )
  },
)
