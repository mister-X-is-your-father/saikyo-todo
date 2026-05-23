/**
 * Phase 6.15 loop iter1169: comment-thread comment-save not-trim path aria-label visible-prefix
 * regression guard。
 *
 * iter1169 で発見した iter1104 sweep 残漏: comment-thread.tsx `comment-save-${id}` button
 * (visible "保存") の not-trim path 旧 aria-label "コメントを保存するには本文を入力して
 * ください" は visible "保存" を中位置 "コメントを **保存** するには…" に持ち voice
 * control prefix-matching「click 保存」 match 不可。pending / default path は iter1104 で
 * 既に visible-prefix em-dash 化済、not-trim だけ漏れていた。
 *
 * 修正 (comment-thread.tsx):
 *   - not-trim: 旧 'コメントを保存するには本文を入力してください'
 *               → '保存 — コメントを保存するには本文を入力してください'
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-comment-save-not-trim-visible-prefix-iter1169.ts
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
  const filePath = resolve(here, '../src/components/workspace/comment-thread.tsx')
  const src = readFileSync(filePath, 'utf8')

  if (!src.includes("'保存 — コメントを保存するには本文を入力してください'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'comment-save not-trim path が visible-prefix 形式 "保存 — ..." でない',
    })
  }
  if (src.includes("'コメントを保存するには本文を入力してください'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 prefix-less "コメントを保存するには..." が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — comment-save not-trim path も visible "保存" 冒頭固定済')
  } else {
    for (const f of findings) console.log(`  [${f.level}/${f.source}] ${f.message}`)
  }
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
