/**
 * Phase 6.15 loop iter 928 (mode-D Desktop a11y) —
 * today-view groups Card region の aria-label を CardTitle id + aria-labelledby
 * に置換、region/heading で source 1 つに集約 (iter926 dashboard MUST 一覧 /
 * iter927 personal-period 同 pattern を today-view groups に展開、region 二重
 * announce sweep 3 件目)。
 *
 * 経緯: groups.map() 内 Card region aria-label "${g.label} ${g.items.length} 件"
 *   と CardTitle visible "${g.label} ({g.items.length})" が同じ意味で 2 重 announce。
 *   CardTitle に id 付与 + Card aria-labelledby で source 1 つに集約、SR 経路統一。
 *
 * 修正 (+5/-3 行、1 file):
 *   - groups.map() の arrow body を block 化、headingId を local 計算
 *   - Card aria-label → aria-labelledby={headingId}
 *   - CardTitle に id={headingId} 追加
 *
 * 検証: source-side regex assert + iter735/927 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const tv = readFileSync(resolve(process.cwd(), 'src/components/workspace/today-view.tsx'), 'utf8')

  // 1. headingId 計算 (replace のみ keep)
  if (/const headingId = `today-group-heading-\$\{g\.label\.replace\(/.test(tv)) {
    findings.push({
      level: 'info',
      message: `today-view groups headingId 計算追加 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `today-view groups headingId 計算欠落`,
    })
  }

  // 2. Card aria-labelledby 化 OK
  if (/<Card key=\{g\.label\} role="region" aria-labelledby=\{headingId\}>/.test(tv)) {
    findings.push({
      level: 'info',
      message: `today-view Card region aria-labelledby 化 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `today-view Card region aria-labelledby 化 失敗`,
    })
  }

  // 3. CardTitle に id 付与 OK
  if (/<CardTitle\s*\n\s*id=\{headingId\}/.test(tv)) {
    findings.push({
      level: 'info',
      message: `today-view CardTitle id 付与 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `today-view CardTitle id 欠落`,
    })
  }

  // 4. 旧 aria-label 完全除去
  if (!/aria-label=\{`\$\{g\.label\} \$\{g\.items\.length\} 件`\}/.test(tv)) {
    findings.push({
      level: 'info',
      message: `today-view 旧 Card aria-label 除去 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `today-view 旧 Card aria-label 残存`,
    })
  }

  // iter927 invariant: personal-period-view aria-labelledby 維持
  const ppv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/personal-period-view.tsx'),
    'utf8',
  )
  if (/<Card role="region" aria-labelledby=\{`period-items-heading-\$\{period\}`\}>/.test(ppv)) {
    findings.push({
      level: 'info',
      message: `iter927 invariant: personal-period Card region aria-labelledby 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter927 invariant: 破壊` })
  }

  // iter735 invariant
  const tce = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  const tceMatches = tce.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tceMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter735 invariant: team-context-editor aria-keyshortcuts 維持 OK (${tceMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant: 破壊` })
  }

  console.log(`\n=== Findings (today-view-groups-aria-iter928) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
