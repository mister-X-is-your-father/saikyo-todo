/**
 * Phase 6.15 loop iter2375: dep-target select に title 付与し aria-label state-dependent
 * 2-path (候補 0 件 / 候補 N 件) と sync (dep-kind iter2373 と pair で 依存 setup form
 * の 2 select 全 hover disclose 完備)。
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

  const idp = readFileSync(
    resolve(here, '../src/components/workspace/item-dependencies-panel.tsx'),
    'utf8',
  )
  if (!idp.includes('iter2375')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'item-dependencies-panel iter2375 marker が無い',
    })
  }
  // empty path 各 text aria-label + title 計 2 回出現
  const emptyText = (
    idp.match(
      /'依存先 Item — 選択可能な候補がありません \(本 Item と循環しない他の Item を作成すると候補に出ます\)'/g,
    ) || []
  ).length
  if (emptyText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `dep-target empty 出現 ${emptyText} 回、aria-label + title 計 2 回必要`,
    })
  }
  // populated path 各 template aria-label + title 計 2 回出現
  const popText = (
    idp.match(
      /`依存先 Item \(候補 \$\{candidates\.length\} 件、本 Item と循環しないものに限定\)`/g,
    ) || []
  ).length
  if (popText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `dep-target populated 出現 ${popText} 回、aria-label + title 計 2 回必要`,
    })
  }

  // iter2373 dep-kind regression 検査
  if (!idp.includes('iter2373')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2373 dep-kind select title が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — dep-target select title 2-path sync 完了、依存 setup form 2 select (dep-kind + dep-target) 全 hover disclose 完備',
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
