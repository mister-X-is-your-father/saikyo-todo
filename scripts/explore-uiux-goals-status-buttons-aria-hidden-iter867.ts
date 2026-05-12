/**
 * Phase 6.15 loop iter 867 (mode-D Desktop a11y) —
 * goals-panel.tsx Goal card status 5 button (完了 / アーカイブ x2 /
 * active に戻す x2) 内 visible text を aria-hidden span で wrap
 * (iter800-866 sweep の続編、iter863/864/865 status button pattern 統一)。
 *
 * 課題: goals-panel.tsx の Goal card 内 status 変更 button 5 個は active /
 *   completed / archived ごとに条件分岐で表示され、各 aria-label が完全
 *   content (Goal 名 + 動作内容) を含むのに、内側 visible text (完了 /
 *   アーカイブ / active に戻す) は aria-hidden 無し → SR で二重読み可能性。
 *
 * fix (1 ファイル ~5 行差分):
 *   - 完了 button "完了" 内 text を <span aria-hidden="true"> で wrap
 *   - アーカイブ button x2 内 "アーカイブ" を <span aria-hidden="true"> で wrap
 *   - active に戻す button x2 内 "active に戻す" を <span aria-hidden="true"> で wrap
 *   - AI 分解 button (line 594) は既存 aria-hidden 済 (iter833)
 *
 * 検証: source-side regex assert + iter735/864/865/866 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  const doneHidden = /<span aria-hidden="true">完了<\/span>/.test(gp)
  const archiveCount = (gp.match(/<span aria-hidden="true">アーカイブ<\/span>/g) ?? []).length
  const reactivateCount = (gp.match(/<span aria-hidden="true">active に戻す<\/span>/g) ?? []).length
  if (doneHidden && archiveCount >= 2 && reactivateCount >= 2) {
    findings.push({
      level: 'info',
      message: `iter867: goals-panel status button (完了 + アーカイブ ${archiveCount} + active に戻す ${reactivateCount}) aria-hidden span OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter867: 不完全 (完了=${doneHidden} アーカイブ=${archiveCount} active=${reactivateCount})`,
    })
  }

  // iter866 invariant: notification-bell 全て既読 aria-hidden 維持
  const nb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/notification-bell.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">全て既読<\/span>/.test(nb)) {
    findings.push({
      level: 'info',
      message: `iter866 invariant: notification-bell 全て既読 aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter866 invariant: 破壊` })
  }

  // iter865 invariant: personal-period-view ゴール保存 aria-hidden 維持
  const ppv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/personal-period-view.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{upsertGoal\.isPending \? '保存中…' : 'ゴール保存'\}<\/span>/.test(
      ppv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter865 invariant: personal-period-view aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter865 invariant: 破壊` })
  }

  // iter864 invariant: integrations-panel aria-hidden 維持
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">履歴<\/span>/.test(ip)) {
    findings.push({
      level: 'info',
      message: `iter864 invariant: integrations-panel aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter864 invariant: 破壊` })
  }

  // iter735 invariant: shadcn UI 未編集
  const tabs = readFileSync(resolve(process.cwd(), 'src/components/ui/tabs.tsx'), 'utf8')
  if (!/aria-hidden/.test(tabs)) {
    findings.push({ level: 'info', message: `iter735 invariant: shadcn/tabs.tsx 未編集 OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `iter735 invariant: shadcn tabs.tsx に aria-hidden 編集が混入`,
    })
  }

  console.log(`\n=== Findings (iter867) ===`)
  if (findings.length === 0) console.log('(なし)')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
