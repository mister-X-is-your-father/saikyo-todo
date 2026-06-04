// @vitest-environment jsdom
/**
 * iter1624: `focusQuickAdd` 共有 helper の unit test。
 *
 * 3 caller (global-shortcuts / focus-quick-add-button / items-board palette) が
 * 共通利用する DOM 副作用 helper のため、副作用契約 (focus + scrollIntoView) と
 * 「要素無時 noop + false」 を明示する。jsdom 環境前提 (vitest 既定)。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { focusElementById, focusQuickAdd } from './focus-quick-add'

/**
 * iter1642: jsdom は `HTMLElement.prototype.scrollIntoView` を実装しないため
 * (HANDOFF §5.30)、`vi.spyOn(el, 'scrollIntoView')` 前に property を define
 * しなければ `"The property 'scrollIntoView' is not defined"` で例外。
 * 5 callsite で同 pattern を書いていたので 1 helper に集約。
 */
function defineScrollIntoView(el: HTMLElement): void {
  ;(el as HTMLElement & { scrollIntoView: (...args: unknown[]) => void }).scrollIntoView = () => {}
}

describe('focusQuickAdd', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('要素が存在しない時は false を返し副作用なし', () => {
    expect(document.getElementById('quick-add-input')).toBeNull()
    expect(focusQuickAdd()).toBe(false)
  })

  describe('要素が DOM に存在する時', () => {
    let input: HTMLInputElement
    let focusSpy: ReturnType<typeof vi.spyOn>
    let scrollSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      input = document.createElement('input')
      input.id = 'quick-add-input'
      // jsdom は HTMLElement.prototype.scrollIntoView を実装していないので spy 前に
      // 定義する (= caller の `el.scrollIntoView(...)` 呼び出しを spy で観測可能に)
      defineScrollIntoView(input)
      document.body.appendChild(input)
      focusSpy = vi.spyOn(input, 'focus')
      scrollSpy = vi.spyOn(input, 'scrollIntoView')
    })

    it('true を返す', () => {
      expect(focusQuickAdd()).toBe(true)
    })

    it('input.focus() を呼ぶ', () => {
      focusQuickAdd()
      expect(focusSpy).toHaveBeenCalledOnce()
    })

    it('input.scrollIntoView({ behavior: "smooth", block: "center" }) を呼ぶ', () => {
      focusQuickAdd()
      expect(scrollSpy).toHaveBeenCalledOnce()
      expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' })
    })

    it('focus → scrollIntoView の順で呼ばれる (= focus 後に view 移動)', () => {
      const calls: string[] = []
      focusSpy.mockImplementation(() => calls.push('focus'))
      scrollSpy.mockImplementation(() => {
        calls.push('scroll')
      })
      focusQuickAdd()
      expect(calls).toEqual(['focus', 'scroll'])
    })
  })
})

describe('focusElementById (iter1625 — 任意 id 版)', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('要素無 → false 返し副作用なし', () => {
    expect(focusElementById('nonexistent-input-zzz')).toBe(false)
  })

  it('要素あり → focus + scrollIntoView を呼んで true 返し', () => {
    const el = document.createElement('input')
    el.id = 'sprint-name'
    defineScrollIntoView(el)
    document.body.appendChild(el)
    const focusSpy = vi.spyOn(el, 'focus')
    const scrollSpy = vi.spyOn(el, 'scrollIntoView')

    expect(focusElementById('sprint-name')).toBe(true)
    expect(focusSpy).toHaveBeenCalledOnce()
    expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' })
  })

  it('focusQuickAdd は focusElementById(quick-add-input) の thin wrapper', () => {
    const el = document.createElement('input')
    el.id = 'quick-add-input'
    defineScrollIntoView(el)
    document.body.appendChild(el)
    const focusSpy = vi.spyOn(el, 'focus')

    expect(focusQuickAdd()).toBe(true)
    expect(focusSpy).toHaveBeenCalledOnce()
  })

  it("空文字 id → false (document.getElementById('') は null を返す defensive 契約)", () => {
    expect(focusElementById('')).toBe(false)
  })

  it('非 input element (div) も id があれば focus される (HTMLElement generic 契約)', () => {
    const el = document.createElement('div')
    el.id = 'cycle-do-tab'
    el.tabIndex = -1 // programmatic focus 可能化
    defineScrollIntoView(el)
    document.body.appendChild(el)
    const focusSpy = vi.spyOn(el, 'focus')

    expect(focusElementById('cycle-do-tab')).toBe(true)
    expect(focusSpy).toHaveBeenCalledOnce()
  })

  it('iter1726: prefers-reduced-motion: reduce → behavior:"auto" (instant scroll、WCAG 2.3.3)', () => {
    const el = document.createElement('input')
    el.id = 'reduced-motion-target'
    defineScrollIntoView(el)
    document.body.appendChild(el)
    const scrollSpy = vi.spyOn(el, 'scrollIntoView')

    // window.matchMedia をモックして reduced-motion=reduce を返す
    const originalMatchMedia = window.matchMedia
    ;(window as Window & { matchMedia: (q: string) => MediaQueryList }).matchMedia = (
      query: string,
    ): MediaQueryList =>
      ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => true,
        onchange: null,
      }) as unknown as MediaQueryList

    try {
      expect(focusElementById('reduced-motion-target')).toBe(true)
      expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'auto', block: 'center' })
    } finally {
      ;(window as Window & { matchMedia: typeof originalMatchMedia }).matchMedia =
        originalMatchMedia
    }
  })

  it('同じ id を持つ複数 element がある時、最初の 1 件だけ focus + scrollIntoView する (document.getElementById 仕様)', () => {
    // HTML 仕様 : 同 id が複数あっても getElementById は最初の 1 件のみ返す。
    // 本 helper は generic で、複数 element 対応は呼び出し側の責務外。
    const el1 = document.createElement('input')
    el1.id = 'duplicate-id'
    ;(el1 as HTMLElement & { scrollIntoView: (...args: unknown[]) => void }).scrollIntoView =
      () => {}
    const el2 = document.createElement('input')
    el2.id = 'duplicate-id'
    ;(el2 as HTMLElement & { scrollIntoView: (...args: unknown[]) => void }).scrollIntoView =
      () => {}
    document.body.appendChild(el1)
    document.body.appendChild(el2)
    const focus1 = vi.spyOn(el1, 'focus')
    const focus2 = vi.spyOn(el2, 'focus')

    expect(focusElementById('duplicate-id')).toBe(true)
    expect(focus1).toHaveBeenCalledOnce()
    expect(focus2).not.toHaveBeenCalled()
  })
})
