/**
 * Phase 6.15 loop iter 327 — ItemEditDialog の TabsList に aria-label 付与 +
 * Activity tab を日本語にローカライズ。
 *
 * 課題: ItemEditDialog の Tabs (基本 / 子タスク / 依存 / コメント / Activity) で
 *   (1) `<TabsList>` (Radix Primitive で role="tablist") に aria-label が無く、
 *       SR ユーザは「何のタブグループか」を知る手掛かりが無い。
 *   (2) "Activity" 1 件だけ英語で、他 4 タブの日本語ラベルと混在 (WCAG 3.1.2
 *       Language of Parts, Level AA 適合性低下)。
 *
 * fix: (1) `<TabsList aria-label="Item 編集タブ">` で landmark / SR ナビ可能に。
 *      (2) "Activity" を "アクティビティ" にローカライズ統一。data-testid
 *          (tab-activity) は変更なし、E2E 影響無し。
 *
 * 機能追加なし、shadcn 編集なし、影響面 1 ファイル、約 4 行差替え。
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
  const target = 'src/components/workspace/item-edit-dialog.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  if (!/<TabsList\b[^>]*?aria-label="Item 編集タブ"/.test(src)) {
    findings.push({ level: 'warning', message: `${target}: TabsList aria-label 不在` })
  }
  if (!/value="activity"[\s\S]*?アクティビティ/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: Activity tab がローカライズされていない`,
    })
  }
  if (/value="activity"[\s\S]*?>Activity<\/TabsTrigger>/.test(src)) {
    findings.push({ level: 'warning', message: `${target}: 旧 "Activity" 英語ラベル残存` })
  }
  if (findings.length === 0) {
    findings.push({
      level: 'info',
      message: `${target}: TabsList aria-label + Activity ローカライズ OK`,
    })
  }

  console.log(`\n=== Findings (item-tabs-a11y-iter327) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
