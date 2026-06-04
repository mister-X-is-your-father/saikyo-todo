/**
 * Phase 6.15 loop iter2031: workflows-panel operations group に title 付与
 * (decompose-proposals bulk group iter1997 と同 group landmark summary pattern)。
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

  const wfp = readFileSync(resolve(here, '../src/components/workflow/workflows-panel.tsx'), 'utf8')
  if (
    !wfp.includes('iter2031') ||
    !wfp.includes(
      "title={`Workflow「${wf.name}」の操作 — 現在 ${wf.enabled ? '有効' : '無効'}、実行 / 編集 / 有効化切替 / 削除`}",
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'workflows-panel operations group title が無い',
    })
  }

  const tmpl = readFileSync(
    resolve(here, '../src/components/template/template-items-editor.tsx'),
    'utf8',
  )
  if (!tmpl.includes('iter2029')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2029 template + 追加 button title が消えている',
    })
  }

  const sp = readFileSync(resolve(here, '../src/components/workspace/sprints-panel.tsx'), 'utf8')
  if (!sp.includes('iter2027') || !sp.includes('iter2025')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2025/2027 sprint-create date title が消えている',
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
    console.log('(なし) — workflows operations group title 付与、iter2029-1777 invariant 不変')
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
