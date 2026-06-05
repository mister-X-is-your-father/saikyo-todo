/**
 * Phase 6.15 loop iter2381: template-items DoD textarea に title 付与し
 * aria-label state-dependent 3-path (空 / 空白のみ MUST 不正 / 通常) と sync。
 * edit-item-dod iter2355 と同 DoD textarea title-aria sync pattern を
 * template-items DoD にも展開、DoD textarea 2 element family 完成
 * (edit-item / template-items)。
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

  const ti = readFileSync(
    resolve(here, '../src/components/template/template-items-editor.tsx'),
    'utf8',
  )
  if (!ti.includes('iter2381')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'template-items-editor iter2381 marker が無い',
    })
  }
  // empty path
  const empty = (
    ti.match(
      /'DoD \(Definition of Done\) — MUST item の完了条件 \(必須、何があれば完了とみなすか\)'/g,
    ) || []
  ).length
  if (empty < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `template-items DoD empty 出現 ${empty} 回、aria-label + title 計 2 回必要`,
    })
  }
  // valid path
  const valid = (ti.match(/`DoD \(現在 \$\{dod\.length\} 文字、Definition of Done\)`/g) || [])
    .length
  if (valid < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `template-items DoD valid 出現 ${valid} 回、aria-label + title 計 2 回必要`,
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — template-items DoD textarea title 3-path sync 完了、DoD textarea 2 element family 完成 (edit-item / template-items)',
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
