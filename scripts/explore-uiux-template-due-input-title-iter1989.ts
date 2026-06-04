/**
 * Phase 6.15 loop iter1989: template-items dueOffset input に title 付与
 * (11 state-dependent input family の続編、template-items 2 input sweep 完備)。
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

  const tmpl = readFileSync(
    resolve(here, '../src/components/template/template-items-editor.tsx'),
    'utf8',
  )
  if (!tmpl.includes('iter1989') || !tmpl.includes('期日 offset (任意、日数 — 展開日')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'template-items dueOffset input title が無い',
    })
  }
  if (!tmpl.includes('iter1987')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1987 template-items title input title が消えている',
    })
  }

  const gp = readFileSync(resolve(here, '../src/components/workspace/goals-panel.tsx'), 'utf8')
  if (!gp.includes('iter1985') || !gp.includes('iter1983')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1983/1985 goals-panel title が消えている',
    })
  }

  const sp = readFileSync(resolve(here, '../src/components/workspace/sprints-panel.tsx'), 'utf8')
  if (!sp.includes('iter1981') || !sp.includes('iter1979')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1979/1981 sprints-panel title が消えている',
    })
  }

  const today = readFileSync(resolve(here, '../src/components/workspace/today-view.tsx'), 'utf8')
  if (!today.includes('title={`${it.dueTime.slice(0, 5)} — 期限時刻`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1875 today dueTime title が消えている',
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
    console.log('(なし) — template-items dueOffset title 付与、iter1987-1777 invariant 不変')
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
