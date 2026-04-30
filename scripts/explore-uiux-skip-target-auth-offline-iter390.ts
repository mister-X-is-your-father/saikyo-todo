/**
 * Phase 6.15 loop iter 390 — auth layout + offline page の `<main>` に
 * id="main-content" を付与 (iter389 で追加した skip-to-main link の target を
 * 拡張、graceful degradation 解消の第 1 弾)。
 *
 * 課題: iter389 で root layout に `<a href="#main-content">` skip-link を追加した
 *   が、auth (login / signup) layout と /~offline page の `<main>` に id 不在
 *   で keyboard user が skip-link を Enter しても何も起きない (graceful
 *   degradation で render は失敗しないが a11y 機能していない)。
 *
 * fix: 2 file × 1 line addition (機能追加なし、shadcn 編集なし)。
 *   - src/app/(auth)/layout.tsx の `<main>` に id="main-content" を付与 (login +
 *     signup の両 page を 1 file で カバー)
 *   - src/app/~offline/page.tsx の `<main>` に id="main-content" を付与
 *
 * 残 page (mock-timesheet 3 page / workspace 配下 8 page) は次 iter で順次。
 *
 * 検証: source-side regex assert で codify。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  // 1. auth layout
  const authSrc = readFileSync(resolve(process.cwd(), 'src/app/(auth)/layout.tsx'), 'utf8')
  if (!/<main\s+id="main-content"/.test(authSrc)) {
    findings.push({
      level: 'warning',
      message: 'src/app/(auth)/layout.tsx: <main id="main-content"> が無い',
    })
  } else {
    findings.push({ level: 'info', message: 'auth layout <main id> OK' })
  }

  // 2. offline page
  const offlineSrc = readFileSync(resolve(process.cwd(), 'src/app/~offline/page.tsx'), 'utf8')
  if (!/<main\s+id="main-content"/.test(offlineSrc)) {
    findings.push({
      level: 'warning',
      message: 'src/app/~offline/page.tsx: <main id="main-content"> が無い',
    })
  } else {
    findings.push({ level: 'info', message: 'offline page <main id> OK' })
  }

  // 3. iter389 layout skip-link 維持
  const layoutSrc = readFileSync(resolve(process.cwd(), 'src/app/layout.tsx'), 'utf8')
  if (!/<a\s+href="#main-content"[\s\S]*?メインコンテンツへスキップ/.test(layoutSrc)) {
    findings.push({
      level: 'warning',
      message: 'src/app/layout.tsx: iter389 skip-link が消えた',
    })
  }

  // 4. iter389 workspace home <main id>
  const wsPageSrc = readFileSync(
    resolve(process.cwd(), 'src/app/(workspace)/[workspaceId]/page.tsx'),
    'utf8',
  )
  if (!/<main id="main-content"/.test(wsPageSrc)) {
    findings.push({
      level: 'warning',
      message: 'workspace home <main id="main-content"> が消えた (iter389 invariant)',
    })
  }

  console.log(`\n=== Findings (skip-target-auth-offline-iter390) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
