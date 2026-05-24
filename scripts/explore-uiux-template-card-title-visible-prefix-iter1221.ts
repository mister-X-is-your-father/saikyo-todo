/**
 * Phase 6.15 loop iter1221: templates-panel template-card title disclosure button
 * aria-label visible-prefix regression guard。
 *
 * iter1221 で発見した visible-prefix 漏れ (template-card delete iter1218 と同 sweep):
 * templates-panel.tsx の Template card title disclosure button:
 *
 * 旧 aria-label `Template「${name}」(${kind}${cron?}) の詳細を ...` は visible {name}
 * (CardTitle heading inside button) を中位置 "Template「**name**」(...)" に持ち voice
 * control prefix-matching「click {name}」 match 不可 (substring 一致のみ)。
 *
 * 修正 (templates-panel.tsx):
 * `${t.name} — Template「${t.name}」(${kind}${cron?}) の詳細を ...` で先頭固定
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-template-card-title-visible-prefix-iter1221.ts
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
  const filePath = resolve(here, '../src/components/template/templates-panel.tsx')
  const src = readFileSync(filePath, 'utf8')

  if (
    !src.includes(
      "`${t.name} — Template「${t.name}」(${t.kind}${t.scheduleCron ? ` · ${t.scheduleCron}` : ''}) の詳細を${expandedId === t.id ? '閉じる' : '開く'}`",
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'template-card title aria-label 新形式 欠落',
    })
  }

  const activeCode = src
    .split('\n')
    .filter((l) => !/^\s*\/\//.test(l) && !/^\s*\*/.test(l))
    .join('\n')
  if (
    activeCode.includes(
      "aria-label={`Template「${t.name}」(${t.kind}${t.scheduleCron ? ` · ${t.scheduleCron}` : ''}) の詳細を${expandedId === t.id ? '閉じる' : '開く'}`}",
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 prefix-less template-card title aria-label が active code に残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — template-card title aria-label は visible 冒頭固定済')
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
