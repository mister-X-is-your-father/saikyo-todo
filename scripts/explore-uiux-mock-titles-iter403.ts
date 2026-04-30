/**
 * Phase 6.15 loop iter 403 — mock-timesheet 3 page (login / new / entries) に
 * `export const metadata: Metadata` を追加 (iter258 pattern を mock-timesheet
 * に水平展開)。
 *
 * 課題: src/app/mock-timesheet/{login,new,entries}/page.tsx は metadata
 *   未定義で root layout の `title: '最強TODO'` をそのまま継承。ブラウザ
 *   tab strip では 3 page が全部 "最強TODO" と表示され見分け不能、SR は
 *   window 切替時に同じ announce で context lost。iter258 で /login /
 *   /signup / /~offline には per-page title metadata を追加済だが、
 *   mock-timesheet は未対応で UX 断絶 (iter378-381 で mock-timesheet 系
 *   a11y polish したが title metadata は別軸で残っていた)。
 *
 * fix: 3 file × ~5 line addition (各 page に Metadata import + metadata
 *   export block 追加)。Next.js metadata API なので head 注入は framework
 *   任せ、機能追加なし、shadcn 編集なし。3 page の title:
 *   - /mock-timesheet/login → "Mock Timesheet ログイン | 最強TODO"
 *   - /mock-timesheet/new → "Mock Timesheet 新規送信 | 最強TODO"
 *   - /mock-timesheet/entries → "Mock Timesheet 送信済み | 最強TODO"
 *
 * 機能追加なし、shadcn 編集なし、影響面 3 ファイル (iter391 の "mock-
 * timesheet 3 page id="main-content"" と同 horizontal expansion 形式)。
 *
 * 検証: source-side regex assert で codify (実 rendered HTML title は
 *   curl で確認済、iter258 と同 pattern)。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

const TARGETS: { path: string; expectedTitle: string }[] = [
  {
    path: 'src/app/mock-timesheet/login/page.tsx',
    expectedTitle: 'Mock Timesheet ログイン | 最強TODO',
  },
  {
    path: 'src/app/mock-timesheet/new/page.tsx',
    expectedTitle: 'Mock Timesheet 新規送信 | 最強TODO',
  },
  {
    path: 'src/app/mock-timesheet/entries/page.tsx',
    expectedTitle: 'Mock Timesheet 送信済み | 最強TODO',
  },
]

async function main(): Promise<void> {
  const findings: Finding[] = []

  for (const t of TARGETS) {
    const src = readFileSync(resolve(process.cwd(), t.path), 'utf8')

    // 1. import type { Metadata } from 'next'
    if (!/import type \{ Metadata \} from 'next'/.test(src)) {
      findings.push({
        level: 'warning',
        message: `${t.path}: \`import type { Metadata } from 'next'\` が無い`,
      })
    } else {
      findings.push({ level: 'info', message: `${t.path}: Metadata import OK` })
    }

    // 2. export const metadata: Metadata
    if (!/export const metadata: Metadata/.test(src)) {
      findings.push({
        level: 'warning',
        message: `${t.path}: \`export const metadata: Metadata\` が無い`,
      })
    } else {
      findings.push({ level: 'info', message: `${t.path}: metadata export OK` })
    }

    // 3. title: '<expected>'
    if (!src.includes(`title: '${t.expectedTitle}'`)) {
      findings.push({
        level: 'warning',
        message: `${t.path}: title="${t.expectedTitle}" が無い`,
      })
    } else {
      findings.push({ level: 'info', message: `${t.path}: title OK` })
    }

    // 4. description present
    if (!/description:/.test(src)) {
      findings.push({
        level: 'warning',
        message: `${t.path}: description が無い`,
      })
    } else {
      findings.push({ level: 'info', message: `${t.path}: description OK` })
    }
  }

  // iter258 invariant 維持: /login /signup /~offline の title metadata
  for (const [path, expected] of [
    ['src/app/(auth)/login/page.tsx', 'ログイン | 最強TODO'],
    ['src/app/(auth)/signup/page.tsx', 'サインアップ | 最強TODO'],
    ['src/app/~offline/page.tsx', 'オフライン | 最強TODO'],
  ] as const) {
    const src = readFileSync(resolve(process.cwd(), path), 'utf8')
    if (!src.includes(`title: '${expected}'`)) {
      findings.push({
        level: 'warning',
        message: `${path}: iter258 title="${expected}" が消えた (regression)`,
      })
    }
  }

  // iter391 invariant 維持: mock-timesheet 3 page <main id="main-content">
  for (const path of TARGETS.map((t) => t.path)) {
    const src = readFileSync(resolve(process.cwd(), path), 'utf8')
    if (!/<main\s+id="main-content"/.test(src)) {
      findings.push({
        level: 'warning',
        message: `${path}: iter391 <main id="main-content"> が消えた (regression)`,
      })
    }
  }

  console.log(`\n=== Findings (mock-titles-iter403) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
