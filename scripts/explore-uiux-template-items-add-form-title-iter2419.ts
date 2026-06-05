/**
 * Phase 6.15 loop iter2419: template-items add form に title 付与し aria-label と sync
 * (Sprint 作成 form iter2045 / proposal 編集 form iter2347 と同 form landmark title sync
 * pattern、Template editor 内 form の hover disclose 補完)。
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

  const tie = readFileSync(
    resolve(here, '../src/components/template/template-items-editor.tsx'),
    'utf8',
  )
  if (!tie.includes('iter2419')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'template-items-editor iter2419 marker が無い',
    })
  }
  const aria = (tie.match(/aria-label="Template 子 Item 追加フォーム"/g) || []).length
  const title = (tie.match(/title="Template 子 Item 追加フォーム"/g) || []).length
  if (aria < 1 || title < 1) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `template-items add form aria=${aria} title=${title}、各 1 必要`,
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — template-items add form title sync 完了、Template editor 内 form の hover disclose 補完',
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
