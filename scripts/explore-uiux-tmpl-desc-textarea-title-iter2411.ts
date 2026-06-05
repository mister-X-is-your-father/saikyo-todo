/**
 * Phase 6.15 loop iter2411: tmpl-desc Textarea に title 付与し aria-label
 * state-dependent 2-path と sync (team-context iter2381 / editDescription iter2297 と同
 * textarea title-aria sync pattern、Template create form の desc Textarea も hover
 * disclose 完備)。
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

  const tp = readFileSync(resolve(here, '../src/components/template/templates-panel.tsx'), 'utf8')
  if (!tp.includes('iter2411')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'templates-panel iter2411 marker が無い',
    })
  }
  const emptyText = (
    tp.match(
      /'説明 — Template の説明 \(任意、このテンプレートが何を生成するか、Cmd\/Ctrl\+Enter で作成\)'/g,
    ) || []
  ).length
  if (emptyText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `tmpl-desc empty 出現 ${emptyText} 回、aria-label + title 計 2 回必要`,
    })
  }
  const valuedText = (
    tp.match(
      /`説明 — Template の説明 \(現在 \$\{description\.length\} 文字、Cmd\/Ctrl\+Enter で作成\)`/g,
    ) || []
  ).length
  if (valuedText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `tmpl-desc valued 出現 ${valuedText} 回、aria-label + title 計 2 回必要`,
    })
  }

  // iter2409 tmpl-kind regression 検査
  if (!tp.includes('iter2409')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2409 tmpl-kind title が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — tmpl-desc Textarea title 2-path sync 完了、Template create form 内 desc Textarea も hover disclose 完備',
    )
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
