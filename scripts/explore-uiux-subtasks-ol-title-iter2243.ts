/**
 * Phase 6.15 loop iter2243: subtasks-panel の 2 ol element (top-level / nested) に
 * title 付与し aria-label と sync (subtask group iter2139 の延長、subtask family の
 * ol 階層 root + nested の title 一致)。
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

  const sp = readFileSync(resolve(here, '../src/components/workspace/subtasks-panel.tsx'), 'utf8')
  if (!sp.includes('iter2243')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'subtasks-panel iter2243 marker が無い',
    })
  }
  // nested ol: aria-label + title 計 2 出現
  const nestedText = (
    sp.match(/「\$\{item\.title\}」の子タスク \$\{grandchildren\.length\} 件/g) || []
  ).length
  if (nestedText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `nested ol aria-label + title text 出現が ${nestedText} 回、aria-label + title 計 2 回必要`,
    })
  }
  // top-level ol: aria-label + title 計 2 出現
  const topText = (
    sp.match(/子タスク 全 \$\{children\.length\} 件 — 子孫含め \$\{totalDescendants\} 件/g) || []
  ).length
  if (topText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `top-level ol aria-label + title text 出現が ${topText} 回、aria-label + title 計 2 回必要`,
    })
  }

  const gp = readFileSync(resolve(here, '../src/components/workspace/goals-panel.tsx'), 'utf8')
  if (!gp.includes('iter2241')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2241 goals-panel KR add form title が消えている',
    })
  }

  const tp = readFileSync(resolve(here, '../src/components/template/templates-panel.tsx'), 'utf8')
  if (!tp.includes('iter2239')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2239 template-card title disclosure button title が消えている',
    })
  }

  const mustBadge = readFileSync(
    resolve(here, '../src/components/workspace/must-badge.tsx'),
    'utf8',
  )
  if (!mustBadge.includes('title="MUST タスク"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1843 MustBadge title が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — subtasks-panel ol 2 element title sync 完了、subtask family ol 階層 root + nested 一致',
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
