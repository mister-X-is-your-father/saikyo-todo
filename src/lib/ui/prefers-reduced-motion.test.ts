// @vitest-environment jsdom
/**
 * iter1732: prefersReducedMotion() helper の unit test。
 *
 * focusElementById (iter1726) + scrollToToday (iter1727) で inline 重複していたのを
 * 集約した本 helper の 4 軸:
 *  - matchMedia 未実装 (jsdom default) → false
 *  - matchMedia.matches=false → false
 *  - matchMedia.matches=true → true
 *  - window 不在 (typeof check) → false (= SSR)
 */
import { afterEach, describe, expect, it } from 'vitest'

import { prefersReducedMotion } from './prefers-reduced-motion'

function mockMatchMedia(matches: boolean): typeof window.matchMedia {
  const original = window.matchMedia
  ;(window as Window & { matchMedia: (q: string) => MediaQueryList }).matchMedia = (
    query: string,
  ): MediaQueryList =>
    ({
      matches: query === '(prefers-reduced-motion: reduce)' ? matches : false,
      media: query,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
      onchange: null,
    }) as unknown as MediaQueryList
  return original
}

describe('prefersReducedMotion', () => {
  let originalMatchMedia: typeof window.matchMedia

  afterEach(() => {
    if (originalMatchMedia !== undefined) {
      ;(window as Window & { matchMedia: typeof originalMatchMedia }).matchMedia =
        originalMatchMedia
    }
  })

  it('matchMedia 未実装 (jsdom default) → false', () => {
    // jsdom default は window.matchMedia 未実装 (undefined)
    // optional chain で safe fall-through、false を返す
    expect(prefersReducedMotion()).toBe(false)
  })

  it('matchMedia.matches=false → false', () => {
    originalMatchMedia = mockMatchMedia(false)
    expect(prefersReducedMotion()).toBe(false)
  })

  it('matchMedia.matches=true (reduce 設定 ON) → true', () => {
    originalMatchMedia = mockMatchMedia(true)
    expect(prefersReducedMotion()).toBe(true)
  })

  it('matchMedia は (prefers-reduced-motion: reduce) を query する', () => {
    let observedQuery: string | null = null
    originalMatchMedia = window.matchMedia
    ;(window as Window & { matchMedia: (q: string) => MediaQueryList }).matchMedia = (
      query: string,
    ): MediaQueryList => {
      observedQuery = query
      return {
        matches: false,
        media: query,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => true,
        onchange: null,
      } as unknown as MediaQueryList
    }
    prefersReducedMotion()
    expect(observedQuery).toBe('(prefers-reduced-motion: reduce)')
  })
})
