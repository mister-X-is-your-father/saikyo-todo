/**
 * Phase 6.15 loop iter2355: edit-item-dod input に title 付与し aria-label
 * state-dependent 3-path (空 / 空白のみ MUST 不正 / 通常) と sync。
 * editTitle iter2295 / editDescription iter2297 と同 ItemEditDialog input
 * title-aria sync pattern を DoD input にも展開、primary input 3 element
 * (title / description / dod) family 完成。
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

  const ed = readFileSync(resolve(here, '../src/components/workspace/item-edit-dialog.tsx'), 'utf8')
  if (!ed.includes('iter2355')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'item-edit-dialog iter2355 marker が無い',
    })
  }
  // empty path
  const empty = (
    ed.match(/'DoD 完了条件 \(MUST item は必須、空欄では保存・done 遷移不可\)'/g) || []
  ).length
  if (empty < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `edit-item-dod empty 出現 ${empty} 回、aria-label + title 計 2 回必要`,
    })
  }
  // invalid path
  const invalid = (
    ed.match(/`DoD \(現在 \$\{dod\.length\} 文字、空白のみは MUST 保存に不正\)`/g) || []
  ).length
  if (invalid < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `edit-item-dod invalid 出現 ${invalid} 回、aria-label + title 計 2 回必要`,
    })
  }
  // valid path
  const valid = (ed.match(/`DoD \(現在 \$\{dod\.length\} 文字、Definition of Done\)`/g) || [])
    .length
  if (valid < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `edit-item-dod valid 出現 ${valid} 回、aria-label + title 計 2 回必要`,
    })
  }

  // iter2295 / iter2297 regression guard
  if (!ed.includes('iter2295') || !ed.includes('iter2297')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2295 / iter2297 editTitle / editDescription title が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — edit-item-dod input title 3-path sync 完了、ItemEditDialog primary input 3 element (title / description / dod) family 完成',
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
