/**
 * Phase 6.15 loop iter 927 (mode-D Desktop a11y) —
 * personal-period-view 「${period}の Item」 Card region と内 ul の aria-label が
 * 完全一致 (= 重複 announce) を排除、CardTitle に id 付与 + region / ul 両方を
 * aria-labelledby で連携 (iter926 dashboard-view MUST 一覧 同 pattern を
 * personal-period-view に展開、region/list 二重 aria-label sweep 続編)。
 *
 * 経緯: Card aria-label "${period}の Item ${N} 件" と ul aria-label
 *   "${period} 期間の Item 一覧 ${N} 件" は SR で重複 announce。CardTitle は visible
 *   "${period}の Item (N)" を heading で持つため、id を付けて aria-labelledby
 *   source を 1 つに集約 = region / list / heading で 3 重統一。
 *
 * 修正 (+7/-3 行、1 file):
 *   - Card role="region" aria-label → aria-labelledby="period-items-heading-${period}"
 *   - CardTitle に id="period-items-heading-${period}" 追加
 *   - ul aria-label → aria-labelledby (同 id)
 *
 * 検証: source-side regex assert + iter735/925 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ppv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/personal-period-view.tsx'),
    'utf8',
  )

  // 1. Card role="region" aria-labelledby 化 OK
  if (/<Card role="region" aria-labelledby=\{`period-items-heading-\$\{period\}`\}>/.test(ppv)) {
    findings.push({
      level: 'info',
      message: `personal-period Card region aria-labelledby 化 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `personal-period Card region aria-labelledby 化 失敗`,
    })
  }

  // 2. CardTitle に id 付与 OK
  if (/id=\{`period-items-heading-\$\{period\}`\}/.test(ppv)) {
    findings.push({
      level: 'info',
      message: `personal-period CardTitle id 付与 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `personal-period CardTitle id 欠落`,
    })
  }

  // 3. ul aria-labelledby 化 OK
  if (
    /data-testid=\{`period-items-\$\{period\}`\}\s*aria-labelledby=\{`period-items-heading-\$\{period\}`\}/.test(
      ppv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `personal-period ul aria-labelledby 化 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `personal-period ul aria-labelledby 化 失敗`,
    })
  }

  // 4. 旧 aria-label 完全除去
  if (
    !/aria-label=\{`\$\{periodLabelJa\(period\)\}の Item \$\{filtered\.length\} 件`\}/.test(ppv)
  ) {
    findings.push({
      level: 'info',
      message: `personal-period 旧 Card aria-label 除去 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `personal-period 旧 Card aria-label 残存`,
    })
  }

  // iter925 invariant: dashboard-view MUST 一覧 ul aria-labelledby (parallel iter926)
  const dv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/dashboard-view.tsx'),
    'utf8',
  )
  if (/aria-labelledby=/.test(dv)) {
    findings.push({
      level: 'info',
      message: `iter926 invariant: dashboard-view aria-labelledby 利用維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter926 invariant: 破壊` })
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

  console.log(`\n=== Findings (personal-period-region-list-aria-iter927) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
