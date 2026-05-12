/**
 * Phase 6.15 loop iter 852 (mode-D Desktop a11y) —
 * bulk-action-bar 解除 button: WCAG 2.5.3 (Label in Name) 適合強化 + visible aria-hidden 統一。
 *
 * 課題: src/components/workspace/bulk-action-bar.tsx の 解除 button は visible "解除"
 *   が旧 aria-label "選択を解除" の末尾に substring としては含まれるが、prefix では
 *   なく voice user の発話 ("解除") と name 先頭が一致しない。iter844-851 で同 file
 *   内の他 button (削除 / status 変更) は label-in-name prefix + aria-hidden 単独経路
 *   に統一済 → 解除 だけが規約から外れる。さらに名前が「何件 clear するか」を伝えない。
 *
 * fix (1 ファイル ~3 行差分):
 *   - aria-label を「解除 (選択 N 件をクリア)」 形に変更し、visible "解除" を name 先頭
 *     に含める (label-in-name prefix 適合)。N 件 hint で「何が消えるか」 を SR に明示。
 *   - 同時に visible "解除" を <span aria-hidden="true"> で wrap、aria-label 単独経路に
 *     統一 (iter844-851 と一貫)。
 *
 * 検証: source-side regex assert + iter735/849/850/851 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const bab = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/bulk-action-bar.tsx'),
    'utf8',
  )

  // 1. bulk-clear aria-label が visible "解除" prefix
  if (/aria-label=\{`解除 \(選択 \$\{count\} 件をクリア\)`\}/.test(bab)) {
    findings.push({
      level: 'info',
      message: `bulk-clear aria-label に visible "解除" prefix (WCAG 2.5.3 適合) OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `bulk-clear aria-label が visible "解除" prefix を含まない`,
    })
  }

  // 2. visible "解除" は span aria-hidden で wrap
  // data-testid="bulk-clear" Button 内に <span aria-hidden="true">解除</span>
  if (/data-testid="bulk-clear"[\s\S]+?<span aria-hidden="true">解除<\/span>/.test(bab)) {
    findings.push({
      level: 'info',
      message: `bulk-clear visible "解除" span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `bulk-clear visible "解除" aria-hidden 未統合`,
    })
  }

  // 3. data-testid="bulk-clear" + variant="ghost" 維持
  if (/data-testid="bulk-clear"/.test(bab) && /variant="ghost"/.test(bab)) {
    findings.push({
      level: 'info',
      message: `bulk-clear data-testid + variant 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `bulk-clear attrs 破壊` })
  }

  // iter851 invariant: bulk-status visible "{s.label} に" span aria-hidden 維持
  if (/<span aria-hidden="true">\{s\.label\} に<\/span>/.test(bab)) {
    findings.push({
      level: 'info',
      message: `iter851 invariant: bulk-status visible "{s.label} に" aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter851 invariant: 破壊` })
  }

  // iter850 invariant: bulk-delete visible "削除" span aria-hidden 維持
  if (/<span aria-hidden="true">削除<\/span>/.test(bab)) {
    findings.push({
      level: 'info',
      message: `iter850 invariant: bulk-delete visible "削除" aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter850 invariant: 破壊` })
  }

  // iter849 invariant: calendar-view 今日 button aria-hidden
  const cv = readFileSync(
    resolve(process.cwd(), 'src/components/schedule/calendar-view.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">今日<\/span>/.test(cv)) {
    findings.push({
      level: 'info',
      message: `iter849 invariant: calendar-view 今日 button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter849 invariant: 破壊` })
  }

  // iter735 invariant: team-context-editor aria-keyshortcuts
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

  console.log(`\n=== Findings (bulk-clear-label-in-name-iter852) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
