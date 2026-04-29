/**
 * Phase 6.15 loop iter 328 — integrations-panel の HTTP method 入力欄ラベルを
 * 日本語化、iter294 等の locale sweep 続編。
 *
 * 課題: integrations-panel.tsx の Source 作成 form で HTTP method (GET / POST)
 *   選択 select の Label が "method" (英語小文字)、aria-label が "HTTP method"
 *   と英語混在で WCAG 3.1.2 (Language of Parts, Level AA) 違反。他 form ラベル
 *   ("名前" / "URL" / "method" / "json body" 等) の中で "method" だけ
 *   ローカライズ漏れ。
 *
 * fix: Label "method" → "HTTP メソッド"、aria-label "HTTP method" →
 *   "HTTP メソッド (GET / POST)" にローカライズ。htmlFor=id="src-method" 連携と
 *   option (GET / POST 大文字略語) は技術用語として維持。機能追加なし、
 *   shadcn 編集なし、影響面 1 ファイル、約 3 行差替え。
 *
 * 検証: source-side regex assert で codify。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const target = 'src/components/integrations/integrations-panel.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  if (/<Label htmlFor="src-method">method<\/Label>/.test(src)) {
    findings.push({ level: 'warning', message: `${target}: 旧 "method" Label 残存` })
  }
  if (!/<Label htmlFor="src-method">HTTP メソッド<\/Label>/.test(src)) {
    findings.push({ level: 'warning', message: `${target}: "HTTP メソッド" Label 不在` })
  }
  if (/aria-label="HTTP method"/.test(src)) {
    findings.push({ level: 'warning', message: `${target}: 旧英語 aria-label 残存` })
  }
  if (!/aria-label="HTTP メソッド/.test(src)) {
    findings.push({ level: 'warning', message: `${target}: 日本語 aria-label 不在` })
  }
  if (findings.length === 0) {
    findings.push({ level: 'info', message: `${target}: HTTP メソッド ローカライズ OK` })
  }

  console.log(`\n=== Findings (http-method-localize-iter328) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
