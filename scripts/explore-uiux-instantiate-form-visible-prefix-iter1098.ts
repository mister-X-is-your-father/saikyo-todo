/**
 * Phase 6.15 loop iter1098: instantiate-form submit button aria-label visible-prefix regression guard。
 *
 * iter1098 で発見した bug: 旧 aria-label `Template「${template.name}」を即実行 (Instantiate)` /
 * `Template「${template.name}」を展開中…` は visible "即実行 (Instantiate)" / "展開中…" を末尾持ち、
 * voice control prefix-matching で「click 即実行」/「click 展開中…」 match 不可。
 * iter1093-1097 sweep convention に合わせ visible 冒頭固定。
 *
 * 修正 (instantiate-form.tsx): aria-label を visible-prefix 形式に変更
 * "即実行 (Instantiate) — Template「name」をワークパッケージとして展開" /
 * "展開中… — Template「name」を即実行中"。
 *
 * instantiate-form は実 supabase + auth + template fixture 必要、Docker 不在 mode で browser
 * 不能のため source-of-truth 直読 invariant に fallback。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-instantiate-form-visible-prefix-iter1098.ts
 * 前提: なし (filesystem 読み込みのみ)
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
  const formPath = resolve(here, '../src/components/template/instantiate-form.tsx')
  const src = readFileSync(formPath, 'utf8')

  // visible-prefix 形式 (default + pending) が含まれるか
  if (!src.includes('即実行 (Instantiate) — Template')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `instantiate-form の default aria-label が '即実行 (Instantiate) — ...' (visible-prefix) でない`,
    })
  }
  if (!src.includes('展開中… — Template')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `instantiate-form の pending aria-label が '展開中… — ...' (visible-prefix) でない`,
    })
  }
  // 旧 visible-suffix が aria-label として残存していないか
  if (src.includes('」を即実行 (Instantiate)`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `旧 visible-suffix '」を即実行 (Instantiate)\`' が aria-label として残存`,
    })
  }
  if (src.includes('」を展開中…`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `旧 visible-suffix '」を展開中…\`' が aria-label として残存`,
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — instantiate-form aria-label は visible-prefix 配置済')
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
