/**
 * Phase 6.15 loop iter865 — decompose-proposals-panel.tsx の 編集 form footer 2 button
 * (キャンセル + 保存) visible text を aria-hidden span で wrap した regression guard。
 *
 *   pnpm tsx scripts/explore-uiux-decompose-proposals-edit-aria-hidden-iter865.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

const FILE = 'src/components/workspace/decompose-proposals-panel.tsx'

function main(): void {
  const findings: Finding[] = []
  const src = readFileSync(resolve(process.cwd(), FILE), 'utf8')

  if (
    !/aria-label=\{`「\$\{proposal\.title\}」の編集をキャンセル`\}[\s\S]{0,80}<span aria-hidden="true">キャンセル<\/span>/.test(
      src,
    )
  ) {
    findings.push({ level: 'error', message: 'キャンセル button visible wrap が無い' })
  }
  if (!/<span aria-hidden="true">\{update\.isPending \? '保存中…' : '保存'\}<\/span>/.test(src)) {
    findings.push({ level: 'error', message: '保存 button visible wrap が無い' })
  }

  // 既存 wrap regression (採用 / 却下 / bulk 全て採用 / 全て却下 / やり直し / 削除 icon)
  for (const needle of [
    '<span aria-hidden="true">全て採用</span>',
    '<span aria-hidden="true">全て却下</span>',
    '<span aria-hidden="true">やり直し</span>',
    '<span aria-hidden="true">✓ 採用</span>',
  ]) {
    if (!src.includes(needle)) {
      findings.push({ level: 'error', message: `既存 wrap "${needle}" が消えた` })
    }
  }

  // raw 単独行残置なし
  if (src.split('\n').some((l) => /^\s*(キャンセル|保存)\s*$/.test(l))) {
    findings.push({ level: 'error', message: 'raw 単独行が残存' })
  }

  console.log(`\n=== Findings (decompose-proposals-edit-aria-hidden iter865) ===`)
  if (findings.length === 0) console.log('(なし) 期待どおり全 invariant OK (static grep verify)')
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  process.exit(findings.some((f) => f.level === 'error') ? 1 : 0)
}

main()
