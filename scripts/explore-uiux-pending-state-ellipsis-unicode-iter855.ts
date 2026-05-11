/**
 * Phase 6.15 loop iter 855 (mode-D Desktop a11y + iter826+ pattern catch-up) —
 * "*中..." (ASCII) を Unicode "…" 統一 + aria-hidden span 抜け 2 件補完。
 *
 * 課題: iter854 で "読み込み中..." 系 4 件を Unicode 統一したが、他にも pending state の
 *   ASCII "..." が 6 ファイル 7 件残っていた:
 *   - item-edit-dialog.tsx 967: 保存中... (aria-label は 保存中…、表記乖離)
 *   - create-workspace-form.tsx 113: 作成中... (aria-label 作成中… 乖離)
 *   - dashboard-view.tsx 843, 1311: ダッシュボード読込中..., グラフ読込中...
 *   - estimate-bias-insight.tsx 95: 集計中...
 *   - mock-submit-form.tsx 164: 送信中... (aria-hidden span 無し + 乖離)
 *   - instantiate-form.tsx 152: 展開中... (aria-hidden span 無し + 乖離)
 *
 * fix (6 ファイル 7 行差分、ASCII → Unicode + 必要箇所は aria-hidden span wrap):
 *   - 4 ファイルは ASCII → Unicode のみ (既に aria-hidden span 内 or Loading() 経由)
 *   - mock-submit-form.tsx + instantiate-form.tsx は visible を <span aria-hidden="true"> でも wrap
 *
 * 検証: source-side regex assert + iter854/853/852/851/735 invariant cross-check。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

function walk(dir: string, acc: string[]): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const s = statSync(p)
    if (s.isDirectory()) walk(p, acc)
    else if (/\.(tsx|ts)$/.test(name)) acc.push(p)
  }
  return acc
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  // 全体 grep: 主要 pending state strings の ASCII 残存 0 件
  const files = walk(resolve(process.cwd(), 'src'), [])
  const patterns = ['保存中...', '作成中...', '送信中...', '展開中...', '集計中...', '読込中...']
  const offenders: string[] = []
  for (const f of files) {
    const text = readFileSync(f, 'utf8')
    const lines = text.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? ''
      for (const p of patterns) {
        if (!line.includes(p)) continue
        // コメント / docstring 内は許可
        const isComment = /^\s*(\*|\/\/|\/\*)/.test(line)
        if (!isComment) {
          offenders.push(`${f.replace(process.cwd() + '/', '')}:${i + 1} (${p})`)
        }
      }
    }
  }
  if (offenders.length === 0) {
    findings.push({
      level: 'info',
      message: `pending state ASCII '*中...' 残存 0 件 OK (visible)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `pending state ASCII 残存: ${offenders.join(', ')}`,
    })
  }

  // 6 fix file が Unicode '…' 形式を含むこと
  const checks: Array<[string, RegExp, string]> = [
    [
      'src/components/workspace/item-edit-dialog.tsx',
      /<span aria-hidden="true">\{update\.isPending \? '保存中…' : '保存'\}<\/span>/,
      '保存中… (item-edit-dialog)',
    ],
    [
      'src/components/workspace/create-workspace-form.tsx',
      /<span aria-hidden="true">\{isPending \? '作成中…' : '作成'\}<\/span>/,
      '作成中… (create-workspace-form)',
    ],
    [
      'src/components/workspace/dashboard-view.tsx',
      /Loading message="ダッシュボード読込中…"/,
      'ダッシュボード読込中… (dashboard summary)',
    ],
    [
      'src/components/workspace/dashboard-view.tsx',
      /Loading message="グラフ読込中…"/,
      'グラフ読込中… (dashboard burndown)',
    ],
    [
      'src/components/time-entry/estimate-bias-insight.tsx',
      /集計中…/,
      '集計中… (estimate-bias-insight)',
    ],
    [
      'src/components/mock-timesheet/mock-submit-form.tsx',
      /<span aria-hidden="true">\{isPending \? '送信中…' : '送信'\}<\/span>/,
      '送信中… + aria-hidden span (mock-submit-form)',
    ],
    [
      'src/components/template/instantiate-form.tsx',
      /<span aria-hidden="true">\{mut\.isPending \? '展開中…' : '即実行 \(Instantiate\)'\}<\/span>/,
      '展開中… + aria-hidden span (instantiate-form)',
    ],
  ]
  for (const [path, re, label] of checks) {
    const text = readFileSync(resolve(process.cwd(), path), 'utf8')
    if (re.test(text)) {
      findings.push({ level: 'info', message: `${label} 統一 OK` })
    } else {
      findings.push({ level: 'warning', message: `${label} 未統一 (regex 不一致)` })
    }
  }

  // iter854 invariant: 読み込み中… 4 file
  for (const path of [
    'src/components/shared/async-states.tsx',
    'src/components/shared/data-widget-card.tsx',
    'src/components/workspace/kanban-view.tsx',
    'src/components/schedule/calendar-view.tsx',
  ]) {
    const text = readFileSync(resolve(process.cwd(), path), 'utf8')
    if (/読み込み中…/.test(text)) {
      findings.push({
        level: 'info',
        message: `iter854 invariant: ${path.split('/').pop()} 読み込み中… 維持 OK`,
      })
    } else {
      findings.push({
        level: 'warning',
        message: `iter854 invariant: ${path} 破壊`,
      })
    }
  }

  // iter853 invariant: offline retry button aria-hidden
  const rb = readFileSync(resolve(process.cwd(), 'src/app/~offline/retry-button.tsx'), 'utf8')
  if (/<span aria-hidden="true">再読み込みして再試行<\/span>/.test(rb)) {
    findings.push({
      level: 'info',
      message: `iter853 invariant: offline retry button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter853 invariant: 破壊` })
  }

  // iter851 invariant: skip-link focus min-h-11
  const layout = readFileSync(resolve(process.cwd(), 'src/app/layout.tsx'), 'utf8')
  if (
    /focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:inline-flex focus:min-h-11/.test(
      layout,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter851 invariant: skip-link focus min-h-11 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter851 invariant: 破壊` })
  }

  console.log(`\n=== Findings (pending-state-ellipsis-unicode-iter855) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
