/**
 * Phase 6.15 loop iter 850 (mode-D Desktop a11y) —
 * item-edit-dialog 6 TabsTrigger visible text を aria-hidden span で wrap (一括)。
 *
 * 課題: item-edit-dialog.tsx の 6 TabsTrigger (基本 / サマリ / 子タスク / 依存 /
 *   コメント / アクティビティ) は各 aria-label が完全 content (タブ説明 + 進捗 etc)
 *   を含むのに visible text に aria-hidden 無し → SR は visible + aria-label の
 *   2 経路で読み上げ重複。Item 編集 dialog の頻繁 navigation control。
 *
 * fix (1 ファイル ~6 行差分):
 *   - 6 TabsTrigger visible text を <span aria-hidden="true"> で wrap (一括)
 *
 * 検証: source-side regex assert + iter844-849 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )

  const tabs: { label: string; pattern: RegExp }[] = [
    { label: '基本', pattern: /<span aria-hidden="true">基本<\/span>/ },
    { label: 'サマリ', pattern: /<span aria-hidden="true">サマリ<\/span>/ },
    { label: '子タスク', pattern: /<span aria-hidden="true">子タスク<\/span>/ },
    { label: '依存', pattern: /<span aria-hidden="true">依存<\/span>/ },
    { label: 'コメント', pattern: /<span aria-hidden="true">コメント<\/span>/ },
    { label: 'アクティビティ', pattern: /<span aria-hidden="true">アクティビティ<\/span>/ },
  ]
  for (const t of tabs) {
    if (t.pattern.test(ied)) {
      findings.push({
        level: 'info',
        message: `item-edit-dialog TabsTrigger ${t.label} aria-hidden OK`,
      })
    } else {
      findings.push({
        level: 'warning',
        message: `item-edit-dialog TabsTrigger ${t.label} aria-hidden 不完全`,
      })
    }
  }

  // iter327 invariant: TabsList aria-label="Item 編集タブ"
  if (/<TabsList className="w-full" aria-label="Item 編集タブ">/.test(ied)) {
    findings.push({
      level: 'info',
      message: `iter327 invariant: TabsList aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter327 invariant: 破壊` })
  }

  // 子タスク progress badge / 依存 blocker count badge は aria-hidden="true" 維持
  if (
    /data-testid="tab-subtasks-progress"\s+aria-hidden="true"/.test(ied) &&
    /data-testid="tab-dependencies-blocker-count"\s+aria-hidden="true"/.test(ied)
  ) {
    findings.push({
      level: 'info',
      message: `tab-subtasks-progress + tab-dependencies-blocker-count badges aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `tab badges aria-hidden invariant: 破壊` })
  }

  // iter849 invariant: calendar-view today button aria-hidden
  const cv = readFileSync(
    resolve(process.cwd(), 'src/components/schedule/calendar-view.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">今日<\/span>/.test(cv)) {
    findings.push({
      level: 'info',
      message: `iter849 invariant: calendar-view today aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter849 invariant: 破壊` })
  }

  // iter848 invariant: quick-add submit button aria-hidden
  const qa = readFileSync(resolve(process.cwd(), 'src/components/workspace/quick-add.tsx'), 'utf8')
  if (/<span aria-hidden="true">\{create\.isPending \? '\.\.\.' : '作成'\}<\/span>/.test(qa)) {
    findings.push({
      level: 'info',
      message: `iter848 invariant: quick-add submit aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter848 invariant: 破壊` })
  }

  // iter843 invariant: item-edit-dialog reload button aria-hidden
  if (/<span aria-hidden="true">最新を読み込み<\/span>/.test(ied)) {
    findings.push({
      level: 'info',
      message: `iter843 invariant: item-edit-dialog reload button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter843 invariant: 破壊` })
  }

  console.log(`\n=== Findings (item-edit-tabs-aria-hidden-iter850) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
