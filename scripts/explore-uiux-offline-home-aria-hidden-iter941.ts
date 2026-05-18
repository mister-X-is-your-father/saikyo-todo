/**
 * Phase 6.15 loop iter 941 (mode-D Desktop a11y) — `~/offline` page の Home `<Link>` の
 * visible "ホームに戻る" text を `<span aria-hidden="true">` で wrap し、
 * SR を aria-label "ホームに戻る (アプリの起点画面に遷移、オンライン復帰後は最新状態を表示)"
 * 単独経路に集約。隣接 OfflineRetryButton (iter256/284 で同 pattern 既適用) と対称化。
 *
 * 課題: Home Link は iter364 で aria-label が付与されたが、visible text "ホームに戻る" は
 *   span aria-hidden で wrap されていなかった。これにより SR ユーザは theoretically
 *   "ホームに戻る" を aria-label 経由で 1 回、visible text の name calculation で 1 回読む
 *   危険があり、iter918-940 で広範囲適用された「visible label + aria-label 同梱内 visible を
 *   aria-hidden で wrap」 pattern (27 iter 累積) と不整合だった。
 *
 * fix: Link 内 "ホームに戻る" text を `<span aria-hidden="true">` で wrap。+1/-1 行 (1 file)。
 *   WCAG 2.5.3 Label in Name は aria-label が "ホームに戻る (...)" で先頭に visible text を
 *   内包しているため継続維持 (voice control "click ホームに戻る" も動作)。
 *
 * 機能追加なし、shadcn 編集なし、影響面 1 ファイル。
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
  const target = 'src/app/~offline/page.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  // Home Link block 抽出
  const linkBlock = src.match(/<Link[\s\S]+?href="\/"[\s\S]+?<\/Link>/)
  if (!linkBlock) {
    findings.push({ level: 'error', message: `${target}: Home Link block 不在` })
  } else {
    // 1. aria-label の維持 (iter364 invariant)
    if (!/aria-label="ホームに戻る \(/.test(linkBlock[0])) {
      findings.push({
        level: 'warning',
        message: `iter364 invariant: aria-label "ホームに戻る (...)" pattern 破壊`,
      })
    } else {
      findings.push({ level: 'info', message: `iter364 invariant (aria-label) OK` })
    }

    // 2. iter941 invariant: 内側 "ホームに戻る" が <span aria-hidden="true"> で wrap
    if (!/<span aria-hidden="true">ホームに戻る<\/span>/.test(linkBlock[0])) {
      findings.push({
        level: 'warning',
        message: `iter941: 内側 "ホームに戻る" が <span aria-hidden="true"> で wrap されていない (sweep pattern 不整合)`,
      })
    } else {
      findings.push({
        level: 'info',
        message: `iter941: visible "ホームに戻る" aria-hidden span wrap OK`,
      })
    }

    // 3. visible text "ホームに戻る" が依然として visible (regression 検出)
    if (!/ホームに戻る/.test(linkBlock[0])) {
      findings.push({
        level: 'warning',
        message: `regression: Home Link visible text "ホームに戻る" 消滅`,
      })
    }
  }

  // iter256 invariant 維持: OfflineRetryButton aria-label + 内側 aria-hidden
  const retrySrc = readFileSync(resolve(process.cwd(), 'src/app/~offline/retry-button.tsx'), 'utf8')
  if (!/aria-label="再読み込みして再試行 \(/.test(retrySrc)) {
    findings.push({
      level: 'warning',
      message: `iter256 invariant: OfflineRetryButton aria-label 破壊`,
    })
  } else if (!/<span aria-hidden="true">再読み込みして再試行<\/span>/.test(retrySrc)) {
    findings.push({
      level: 'warning',
      message: `iter256 invariant: OfflineRetryButton 内側 aria-hidden span 破壊`,
    })
  } else {
    findings.push({
      level: 'info',
      message: `iter256 invariant (OfflineRetryButton aria-label + 内側 aria-hidden) OK`,
    })
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
      message: `iter735 invariant: team-context-editor aria-keyshortcuts ${tceMatches.length} 箇所 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant 破壊` })
  }

  // iter939 invariant: HANDOFF iter939 entry 維持
  const handoff = readFileSync(resolve(process.cwd(), 'HANDOFF.md'), 'utf8')
  if (/iter939/.test(handoff)) {
    findings.push({ level: 'info', message: `iter939 HANDOFF note 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter939 HANDOFF note 消滅` })
  }

  console.log(`\n=== Findings (offline-home-aria-hidden-iter941) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
