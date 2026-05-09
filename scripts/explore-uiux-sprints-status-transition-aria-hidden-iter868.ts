/**
 * Phase 6.15 loop iter 868 (mode-D Desktop a11y) —
 * sprints-panel status 遷移 4 button (稼働開始 / 完了 / 計画に戻す / 中止) visible を
 * aria-hidden span で wrap。
 *
 * 課題: src/components/workspace/sprints-panel.tsx の 4 status 遷移 button:
 *   - 稼働開始 button (planning → active、行 717-735)
 *   - 完了 button (active → completed、行 738-754)
 *   - 計画に戻す button (active → planning、行 755-770)
 *   - 中止 button (any → cancelled、行 773-797)
 *
 *   いずれも aria-label が完全 content (Sprint 名 + 操作) を含むのに visible が
 *   aria-hidden 無し → SR 2 経路読み上げ重複。iter864 (empty + period 編集 form
 *   2 button) の続き、sprint domain 部分 fix (振り返り生成 / Pre-mortem button は
 *   次 iter)。
 *
 * fix (1 ファイル +4/-4 行):
 *   - 4 status 遷移 button visible を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter864 / iter867 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )

  const checks: Array<[string, RegExp]> = [
    ['稼働開始', /<span aria-hidden="true">稼働開始<\/span>/],
    ['完了', /<span aria-hidden="true">完了<\/span>/],
    ['計画に戻す', /<span aria-hidden="true">計画に戻す<\/span>/],
    ['中止', /<span aria-hidden="true">中止<\/span>/],
  ]
  for (const [name, re] of checks) {
    if (re.test(sp)) {
      findings.push({ level: 'info', message: `iter868: sprint ${name} button aria-hidden OK` })
    } else {
      findings.push({
        level: 'warning',
        message: `iter868: sprint ${name} button aria-hidden 不完全`,
      })
    }
  }

  // invariant: 4 button aria-label 維持
  if (
    /aria-label=\{[\s\S]*?`Sprint「\$\{sprint\.name\}」を稼働開始`/.test(sp) &&
    /aria-label=\{[\s\S]*?`Sprint「\$\{sprint\.name\}」を完了`/.test(sp) &&
    /aria-label=\{[\s\S]*?`Sprint「\$\{sprint\.name\}」を計画に戻す`/.test(sp) &&
    /aria-label=\{[\s\S]*?`Sprint「\$\{sprint\.name\}」を中止`/.test(sp)
  ) {
    findings.push({
      level: 'info',
      message: `iter868 invariant: 4 status 遷移 button aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter868 invariant: 破壊` })
  }

  // iter864 invariant
  if (
    /<span aria-hidden="true">作成フォームへ<\/span>/.test(sp) &&
    /<span aria-hidden="true">キャンセル<\/span>/.test(sp) &&
    /<span aria-hidden="true">\{update\.isPending \? '保存中…' : '保存'\}<\/span>/.test(sp)
  ) {
    findings.push({
      level: 'info',
      message: `iter864 invariant: sprints empty + period 編集 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter864 invariant: 破壊` })
  }

  // iter867 invariant
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if ((gp.match(/<span aria-hidden="true">/g) ?? []).length >= 6) {
    findings.push({
      level: 'info',
      message: `iter867 invariant: goals-panel aria-hidden span count >=6 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter867 invariant: 破壊` })
  }

  console.log(`\n=== Findings (sprints-status-transition-aria-hidden-iter868) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
