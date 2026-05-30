/**
 * Phase 6.15 loop iter1499: home page (src/app/page.tsx) Workspace 一覧 Link aria-label を
 * em-dash 統一 (regression guard、iter679/830 既存 invariant 維持)。
 *
 * iter1093-1498 em-dash sweep で codebase 全体の visible-prefix button/link aria-label を
 * em-dash 区切に統一済だが、home page Workspace 一覧の Link は `'${ws.name} (slug: ${ws.slug}, role: ${ws.role}) を開く'`
 * で旧 paren convention + 内側 colon-key:value pair が残存していた (iter679 で `aria-label`
 * 追加時の形式)。
 *
 * 修正 (src/app/page.tsx):
 *   aria-label={`${ws.name} (slug: ${ws.slug}, role: ${ws.role}) を開く`}
 * → aria-label={`${ws.name} を開く — slug: ${ws.slug} / role: ${ws.role}`}
 *
 *   - visible-prefix ${ws.name} は無変更で voice control prefix-matching 維持
 *   - verb "を開く" を先頭側に移動 (iter1493 operation-board `${title} を開く — descriptive` pattern と統一)
 *   - 内側 key:value pair の colon は構造化 vocab で維持 (key1: val / key2: val)
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-home-workspace-link-em-dash-iter1499.ts
 * 前提: なし (source 直読 invariant)
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

interface Finding {
  level: 'error' | 'warning' | 'info'
  source: string
  message: string
}

async function main() {
  const findings: Finding[] = []
  const here = dirname(fileURLToPath(import.meta.url))
  const filePath = resolve(here, '../src/app/page.tsx')
  const src = readFileSync(filePath, 'utf8')

  // 1. em-dash 新形式
  if (!src.includes('aria-label={`${ws.name} を開く — slug: ${ws.slug} / role: ${ws.role}`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'home Workspace Link aria-label が em-dash 形式 "${name} を開く — slug: ..." でない',
    })
  }
  // 2. 旧 paren 残存
  if (src.includes('aria-label={`${ws.name} (slug: ${ws.slug}, role: ${ws.role}) を開く`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'home Workspace Link 旧 () 区切 aria-label が残存',
    })
  }

  // 3. iter830 invariant: 内側 div aria-hidden 維持
  if (!src.includes('<div className="flex items-center justify-between" aria-hidden="true">')) {
    findings.push({
      level: 'warning',
      source: 'a11y',
      message: 'iter830 invariant: home Workspace Link 内 outer div aria-hidden が破壊された',
    })
  }

  // 4. iter679 invariant: focus-visible ring 維持
  if (!src.includes('focus-visible:ring-ring')) {
    findings.push({
      level: 'warning',
      source: 'a11y',
      message: 'iter679 invariant: home Workspace Link focus-visible ring が破壊された',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — home Workspace Link aria-label が em-dash convention 統一済')
  } else {
    for (const f of findings) console.log(`  [${f.level}/${f.source}] ${f.message}`)
  }
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.filter((f) => f.level === 'error').length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
