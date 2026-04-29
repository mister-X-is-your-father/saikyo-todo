/**
 * Phase 6.15 iter — TickTick タスクタイマー Scope B (Document Picture-in-Picture)。
 *
 * `window.documentPictureInPicture.requestWindow` を使って **別 window 化 +
 * 常に手前表示** を実現する pure helper 群。Chrome / Edge のみ動作、
 * Safari / Firefox は未対応 (capability 検出で fall back)。
 *
 * 設計判断:
 *   - **window / document を引数で受け取る**。global を直接読まないことで、
 *     vitest (node env、jsdom 未使用) で plain object mock だけでテスト可能。
 *   - `requestWindow` の例外は `null` 返却に畳む (ユーザ拒否 / unsupported は
 *     UI 側で同じ「PiP 開けず」状態として扱えれば十分)。
 *   - stylesheet の clone は `<link rel="stylesheet">` / `<style>` / 構築済
 *     `adoptedStyleSheets` の 3 経路を網羅。Next.js dev (inline `<style>`) /
 *     prod (link href) どちらでも Tailwind 等が PiP window でも効く。
 */

interface DocumentPipApi {
  requestWindow(opts: { width?: number; height?: number }): Promise<Window>
}

/** 現在の global window から documentPictureInPicture API を取り出す。無ければ null。 */
export function getDocumentPipApi(win?: Window | null): DocumentPipApi | null {
  const w = win ?? (typeof window !== 'undefined' ? window : null)
  if (!w) return null
  const api = (w as unknown as { documentPictureInPicture?: unknown }).documentPictureInPicture
  if (!api || typeof (api as DocumentPipApi).requestWindow !== 'function') {
    return null
  }
  return api as DocumentPipApi
}

/** Document PiP API が利用可能か (Chrome 116+ / Edge)。 */
export function isDocumentPipSupported(win?: Window | null): boolean {
  return getDocumentPipApi(win) !== null
}

export interface OpenPipOpts {
  width: number
  height: number
  /** テスト用 / SSR safe の override。省略時は global window。 */
  sourceWindow?: Window | null
}

/**
 * Document PiP window を開く。未対応 / ユーザ拒否 / 例外時は null を返す
 * (caller は toast 出すなりして UI 状態を戻せる)。
 */
export async function openDocumentPipWindow(opts: OpenPipOpts): Promise<Window | null> {
  const api = getDocumentPipApi(opts.sourceWindow)
  if (!api) return null
  try {
    return await api.requestWindow({ width: opts.width, height: opts.height })
  } catch {
    return null
  }
}

/**
 * source document の stylesheet を target window の document.head に clone。
 *
 *   1. `<link rel="stylesheet">` は href ごと clone
 *   2. `<style>` は textContent を clone
 *   3. 構築済 `adoptedStyleSheets` は同じ参照を target に渡す (Chrome は許可)
 *
 * いずれも best-effort (1 つでも失敗しても他経路は続行)。
 */
export function copyStylesheetsToWindow(target: Window, sourceDoc?: Document | null): void {
  const doc = sourceDoc ?? (typeof document !== 'undefined' ? document : null)
  if (!doc) return
  const targetDoc = target.document
  if (!targetDoc) return
  const head = targetDoc.head
  if (!head) return

  const links = doc.querySelectorAll('link[rel="stylesheet"]')
  links.forEach((link) => {
    const clone = targetDoc.createElement('link')
    clone.setAttribute('rel', 'stylesheet')
    const href = link.getAttribute('href')
    if (href) clone.setAttribute('href', href)
    const media = link.getAttribute('media')
    if (media) clone.setAttribute('media', media)
    head.appendChild(clone)
  })

  const styles = doc.querySelectorAll('style')
  styles.forEach((style) => {
    const clone = targetDoc.createElement('style')
    clone.textContent = style.textContent ?? ''
    head.appendChild(clone)
  })

  const adopted = (doc as unknown as { adoptedStyleSheets?: CSSStyleSheet[] }).adoptedStyleSheets
  if (adopted && adopted.length > 0) {
    try {
      ;(targetDoc as unknown as { adoptedStyleSheets: CSSStyleSheet[] }).adoptedStyleSheets =
        adopted
    } catch {
      // 一部 browser は cross-document な構造化 stylesheet を拒否する。
      // link / style 経路で Tailwind 等は届いているので silent ignore。
    }
  }
}
