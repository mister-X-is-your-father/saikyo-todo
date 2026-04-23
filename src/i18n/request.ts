import { getRequestConfig } from 'next-intl/server'

// MVP は日本語のみ。英語追加時はここに追加し、`messages/<locale>.json` を作る。
type Locale = 'ja'
const DEFAULT_LOCALE: Locale = 'ja'

export default getRequestConfig(async () => {
  const locale: Locale = DEFAULT_LOCALE
  const messages = (await import(`../../messages/${locale}.json`)).default
  return { locale, messages }
})
