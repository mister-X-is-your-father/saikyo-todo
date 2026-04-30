/**
 * Phase 6.15 loop iter 407 — workspace 配下に layout.tsx (title.template +
 * default) + 8 page に per-page title metadata 追加 (iter258 / iter403
 * pattern を workspace に水平展開、metadata 集約 DRY)。
 *
 * 課題: workspace 配下 9 page は metadata 未定義で root layout の
 *   `title: '最強TODO'` をそのまま継承。ブラウザ tab strip では 9 page が
 *   全部 "最強TODO" と表示され見分け不能、SR は window 切替時に同じ
 *   announce で context lost。iter258 で /login / /signup / /~offline 、
 *   iter403 で mock-timesheet 3 page には per-page title metadata を
 *   追加済だが、workspace 配下は未対応で UX 断絶。
 *
 * fix: 1 new file (layout.tsx) + 8 page metadata block 追加。
 *   - src/app/(workspace)/[workspaceId]/layout.tsx (新規):
 *     `metadata.title = { template: '%s | 最強TODO', default: 'Workspace | 最強TODO' }`
 *     で workspace tree 全体に title.template を設定 (DRY: page ごとに
 *     ' | 最強TODO' を書かなくて済む)。children を passthrough のみ。
 *   - sprints/page.tsx → title: 'Sprints' (= "Sprints | 最強TODO")
 *   - goals/page.tsx → title: 'Goals'
 *   - pdca/page.tsx → title: 'PDCA'
 *   - workflows/page.tsx → title: 'Workflows'
 *   - time-entries/page.tsx → title: '稼働記録'
 *   - templates/page.tsx → title: 'Templates'
 *   - integrations/page.tsx → title: 'Integrations'
 *   - archive/page.tsx → title: 'Archive'
 *
 *   workspace home `[workspaceId]/page.tsx` は workspace の動的 displayName
 *   を h1 で出すため per-page title を付けず layout default
 *   ("Workspace | 最強TODO") にフォールバック (将来 displayName を
 *   generateMetadata で動的 title 化する場合の foundation)。
 *
 * 機能追加なし、shadcn 編集なし、影響面 9 ファイル (1 layout 新規 + 8 page
 * metadata 追加)。Next.js metadata API なので head 注入は framework 任せ、
 * desktop 動作は不変。
 *
 * 検証: source-side regex assert で codify。dev server curl は workspace
 *   page が auth 必須のため不可、static audit で代替。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

const PAGE_TITLES: { path: string; title: string }[] = [
  { path: 'src/app/(workspace)/[workspaceId]/sprints/page.tsx', title: 'Sprints' },
  { path: 'src/app/(workspace)/[workspaceId]/goals/page.tsx', title: 'Goals' },
  { path: 'src/app/(workspace)/[workspaceId]/pdca/page.tsx', title: 'PDCA' },
  { path: 'src/app/(workspace)/[workspaceId]/workflows/page.tsx', title: 'Workflows' },
  { path: 'src/app/(workspace)/[workspaceId]/time-entries/page.tsx', title: '稼働記録' },
  { path: 'src/app/(workspace)/[workspaceId]/templates/page.tsx', title: 'Templates' },
  { path: 'src/app/(workspace)/[workspaceId]/integrations/page.tsx', title: 'Integrations' },
  { path: 'src/app/(workspace)/[workspaceId]/archive/page.tsx', title: 'Archive' },
]

async function main(): Promise<void> {
  const findings: Finding[] = []

  // 1. layout.tsx 存在 + title.template + title.default
  const layoutPath = 'src/app/(workspace)/[workspaceId]/layout.tsx'
  const layoutSrc = readFileSync(resolve(process.cwd(), layoutPath), 'utf8')

  if (!/template:\s*'%s \| 最強TODO'/.test(layoutSrc)) {
    findings.push({
      level: 'warning',
      message: `${layoutPath}: title.template が無い`,
    })
  } else {
    findings.push({ level: 'info', message: `${layoutPath}: title.template OK` })
  }

  if (!/default:\s*'Workspace \| 最強TODO'/.test(layoutSrc)) {
    findings.push({
      level: 'warning',
      message: `${layoutPath}: title.default が無い`,
    })
  } else {
    findings.push({ level: 'info', message: `${layoutPath}: title.default OK` })
  }

  // 2. 各 page の per-page title
  for (const { path, title } of PAGE_TITLES) {
    const src = readFileSync(resolve(process.cwd(), path), 'utf8')

    if (!/import type \{ Metadata \} from 'next'/.test(src)) {
      findings.push({
        level: 'warning',
        message: `${path}: Metadata import が無い`,
      })
    }

    const pattern = new RegExp(
      `export const metadata: Metadata = \\{ title: '${title.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}' \\}`,
    )
    if (!pattern.test(src)) {
      findings.push({
        level: 'warning',
        message: `${path}: title='${title}' が無い`,
      })
    } else {
      findings.push({ level: 'info', message: `${path}: title='${title}' OK` })
    }
  }

  // iter258 invariant 維持: /login /signup /~offline title metadata
  for (const [path, expected] of [
    ['src/app/(auth)/login/page.tsx', 'ログイン | 最強TODO'],
    ['src/app/(auth)/signup/page.tsx', 'サインアップ | 最強TODO'],
    ['src/app/~offline/page.tsx', 'オフライン | 最強TODO'],
  ] as const) {
    const src = readFileSync(resolve(process.cwd(), path), 'utf8')
    if (!src.includes(`title: '${expected}'`)) {
      findings.push({
        level: 'warning',
        message: `${path}: iter258 title が消えた (regression)`,
      })
    }
  }

  // iter403 invariant 維持: mock-timesheet 3 page title metadata
  for (const path of [
    'src/app/mock-timesheet/login/page.tsx',
    'src/app/mock-timesheet/new/page.tsx',
    'src/app/mock-timesheet/entries/page.tsx',
  ]) {
    const src = readFileSync(resolve(process.cwd(), path), 'utf8')
    if (!/export const metadata: Metadata/.test(src)) {
      findings.push({
        level: 'warning',
        message: `${path}: iter403 metadata export が消えた (regression)`,
      })
    }
  }

  console.log(`\n=== Findings (workspace-titles-iter407) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
