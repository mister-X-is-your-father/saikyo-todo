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
      ;(input as HTMLElement & { scrollIntoView: (...args: unknown[]) => void }).scrollIntoView =
        () => {}
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
    ;(el as HTMLElement & { scrollIntoView: (...args: unknown[]) => void }).scrollIntoView =
      () => {}
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
    ;(el as HTMLElement & { scrollIntoView: (...args: unknown[]) => void }).scrollIntoView =
      () => {}
    document.body.appendChild(el)
    const focusSpy = vi.spyOn(el, 'focus')

    expect(focusQuickAdd()).toBe(true)
    expect(focusSpy).toHaveBeenCalledOnce()
  })
})
