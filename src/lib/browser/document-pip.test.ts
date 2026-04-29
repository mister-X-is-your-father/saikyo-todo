import { describe, expect, it, vi } from 'vitest'

import {
  copyStylesheetsToWindow,
  getDocumentPipApi,
  isDocumentPipSupported,
  openDocumentPipWindow,
} from './document-pip'

function makeWindow(api?: unknown): Window {
  return { documentPictureInPicture: api } as unknown as Window
}

interface FakeElement {
  tagName: string
  attrs: Record<string, string>
  textContent: string | null
  setAttribute(name: string, value: string): void
  getAttribute(name: string): string | null
}

function makeElement(tagName: string, attrs: Record<string, string> = {}): FakeElement {
  return {
    tagName,
    attrs: { ...attrs },
    textContent: null,
    setAttribute(name, value) {
      this.attrs[name] = value
    },
    getAttribute(name) {
      return this.attrs[name] ?? null
    },
  }
}

interface FakeDoc {
  links: FakeElement[]
  styles: FakeElement[]
  adoptedStyleSheets?: unknown[]
  querySelectorAll(selector: string): { forEach(cb: (el: FakeElement) => void): void }
}

function makeSourceDoc(opts: {
  links?: FakeElement[]
  styles?: FakeElement[]
  adopted?: unknown[]
}): Document {
  const doc: FakeDoc = {
    links: opts.links ?? [],
    styles: opts.styles ?? [],
    adoptedStyleSheets: opts.adopted,
    querySelectorAll(selector) {
      const list =
        selector === 'link[rel="stylesheet"]' ? this.links : selector === 'style' ? this.styles : []
      return {
        forEach(cb) {
          for (const el of list) cb(el)
        },
      }
    },
  }
  return doc as unknown as Document
}

function makeTargetWindow(): {
  window: Window
  appended: FakeElement[]
  doc: { adoptedStyleSheets?: unknown[] }
} {
  const appended: FakeElement[] = []
  const head = {
    appendChild(el: FakeElement) {
      appended.push(el)
      return el
    },
  }
  const doc: {
    head: typeof head
    createElement: (tag: string) => FakeElement
    adoptedStyleSheets?: unknown[]
  } = {
    head,
    createElement: (tag) => makeElement(tag),
  }
  const win = { document: doc } as unknown as Window
  return { window: win, appended, doc }
}

describe('getDocumentPipApi / isDocumentPipSupported', () => {
  it('window が undefined / api 不在なら null / false', () => {
    expect(getDocumentPipApi(null)).toBeNull()
    expect(isDocumentPipSupported(null)).toBe(false)
    expect(getDocumentPipApi(makeWindow(undefined))).toBeNull()
    expect(isDocumentPipSupported(makeWindow(undefined))).toBe(false)
  })

  it('requestWindow が関数でなければ null (= 非対応)', () => {
    const win = makeWindow({ requestWindow: 'not-a-function' })
    expect(getDocumentPipApi(win)).toBeNull()
    expect(isDocumentPipSupported(win)).toBe(false)
  })

  it('requestWindow を持っていれば api を返す / supported=true', () => {
    const api = { requestWindow: vi.fn() }
    const win = makeWindow(api)
    expect(getDocumentPipApi(win)).toBe(api)
    expect(isDocumentPipSupported(win)).toBe(true)
  })
})

describe('openDocumentPipWindow', () => {
  it('未対応なら null', async () => {
    const result = await openDocumentPipWindow({
      width: 320,
      height: 140,
      sourceWindow: makeWindow(undefined),
    })
    expect(result).toBeNull()
  })

  it('requestWindow を呼んで結果を返す + width/height を渡す', async () => {
    const fakePipWin = { fake: true } as unknown as Window
    const requestWindow = vi.fn().mockResolvedValue(fakePipWin)
    const win = makeWindow({ requestWindow })
    const result = await openDocumentPipWindow({ width: 320, height: 140, sourceWindow: win })
    expect(result).toBe(fakePipWin)
    expect(requestWindow).toHaveBeenCalledWith({ width: 320, height: 140 })
  })

  it('requestWindow が reject (ユーザ拒否 等) しても throw せず null', async () => {
    const requestWindow = vi.fn().mockRejectedValue(new Error('user denied'))
    const win = makeWindow({ requestWindow })
    const result = await openDocumentPipWindow({ width: 320, height: 140, sourceWindow: win })
    expect(result).toBeNull()
  })
})

describe('copyStylesheetsToWindow', () => {
  it('link[rel=stylesheet] を href / media ごと clone', () => {
    const link = makeElement('LINK', {
      rel: 'stylesheet',
      href: '/styles.css',
      media: 'screen',
    })
    const sourceDoc = makeSourceDoc({ links: [link] })
    const target = makeTargetWindow()

    copyStylesheetsToWindow(target.window, sourceDoc)

    expect(target.appended).toHaveLength(1)
    expect(target.appended[0]?.tagName).toBe('link')
    expect(target.appended[0]?.attrs.rel).toBe('stylesheet')
    expect(target.appended[0]?.attrs.href).toBe('/styles.css')
    expect(target.appended[0]?.attrs.media).toBe('screen')
  })

  it('<style> タグは textContent ごと clone', () => {
    const style = makeElement('STYLE')
    style.textContent = '.foo { color: red; }'
    const sourceDoc = makeSourceDoc({ styles: [style] })
    const target = makeTargetWindow()

    copyStylesheetsToWindow(target.window, sourceDoc)

    expect(target.appended).toHaveLength(1)
    expect(target.appended[0]?.tagName).toBe('style')
    expect(target.appended[0]?.textContent).toBe('.foo { color: red; }')
  })

  it('link + style 混在を順に clone', () => {
    const link = makeElement('LINK', { rel: 'stylesheet', href: '/a.css' })
    const style = makeElement('STYLE')
    style.textContent = 'body { margin: 0; }'
    const sourceDoc = makeSourceDoc({ links: [link], styles: [style] })
    const target = makeTargetWindow()

    copyStylesheetsToWindow(target.window, sourceDoc)

    expect(target.appended.map((el) => el.tagName)).toEqual(['link', 'style'])
  })

  it('adoptedStyleSheets を target に伝播 (試みて失敗しても throw しない)', () => {
    const sheets = [{ id: 'a' }, { id: 'b' }] as unknown as CSSStyleSheet[]
    const sourceDoc = makeSourceDoc({ adopted: sheets })
    const target = makeTargetWindow()

    expect(() => copyStylesheetsToWindow(target.window, sourceDoc)).not.toThrow()
    expect(target.doc.adoptedStyleSheets).toEqual(sheets)
  })

  it('document が無い (SSR) / target に document.head 無し → 何もしない (no-throw)', () => {
    expect(() => copyStylesheetsToWindow({} as Window, makeSourceDoc({}))).not.toThrow()
    expect(() =>
      copyStylesheetsToWindow({ document: {} } as unknown as Window, makeSourceDoc({})),
    ).not.toThrow()
  })

  it('source / target が空でも例外を投げない', () => {
    const sourceDoc = makeSourceDoc({})
    const target = makeTargetWindow()
    expect(() => copyStylesheetsToWindow(target.window, sourceDoc)).not.toThrow()
    expect(target.appended).toHaveLength(0)
  })
})
