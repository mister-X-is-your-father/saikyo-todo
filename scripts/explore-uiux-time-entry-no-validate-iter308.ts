/**
 * Phase 6.15 loop iter 308 — time-entry create form に noValidate 追加で
 * production sweep 完結 (12/12 production form)。
 *
 * iter303-307 noValidate sweep の最終回。create-time-entry-form.tsx の
 * 1 form (time-entry 作成: item 選択 + 開始 / 終了時刻 + 説明) に
 * noValidate 漏れ。
 *
 * これで production form 全 12 件で noValidate 統一達成。残るは
 * mock-timesheet (test fixture × 3) のみで、CLAUDE.md で「saikyo-todo
 * とは独立」と明記された Playwright 用 mock 外部システムなので除外。
 *
 * 期待 (fix 後):
 *   create-time-entry-form の <form> に noValidate 含む。
 *   全 production form sweep 完了 invariant: codebase 内 production
 *   form は全て noValidate 付き。
 *
 *   pnpm tsx scripts/explore-uiux-time-entry-no-validate-iter308.ts
 */
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

function checkFile(path: string): { count: number; withNV: number } {
  const src = readFileSync(resolve(process.cwd(), path), 'utf8')
  const count = (src.match(/<form\b/g) ?? []).length
  const withNV = src
    .split(/<form\b/)
    .slice(1)
    .filter((after) => {
      const tagEnd = after.indexOf('>')
      if (tagEnd === -1) return false
      return /\bnoValidate\b/.test(after.slice(0, tagEnd))
    }).length
  return { count, withNV }
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  // 1. time-entry 単体
  const target = 'src/components/time-entry/create-time-entry-form.tsx'
  const { count, withNV } = checkFile(target)
  findings.push({ level: 'info', message: `${target}: <form>=${count}, noValidate=${withNV}` })
  if (count !== withNV) {
    findings.push({
      level: 'warning',
      message: `${target}: noValidate 漏れ ${count - withNV} 個`,
    })
  }

  // 2. production sweep 全体: codebase 内 production form (mock-timesheet 除く)
  //    で noValidate 漏れが無いこと
  const allFormFiles = execSync(`grep -rln "<form" src/components --include="*.tsx" || true`, {
    encoding: 'utf8',
  })
    .split('\n')
    .filter((l) => l.length > 0 && !l.includes('mock-timesheet'))

  let totalCount = 0
  let totalWithNV = 0
  for (const f of allFormFiles) {
    const { count: c, withNV: w } = checkFile(f)
    totalCount += c
    totalWithNV += w
    if (c !== w) {
      findings.push({
        level: 'warning',
        message: `${f}: noValidate 漏れ ${c - w} 個`,
      })
    }
  }
  findings.push({
    level: 'info',
    message: `production sweep: ${totalCount} form 中 ${totalWithNV} 個に noValidate (mock-timesheet 除く)`,
  })

  console.log(`\n=== Findings (time-entry-no-validate-iter308) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
