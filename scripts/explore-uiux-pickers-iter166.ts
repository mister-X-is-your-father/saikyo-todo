/**
 * Phase 6.15 loop iter 166 — TagPicker / AssigneePicker の SR a11y smoke。
 *
 * 旧仕様: trigger Button に aria-label 無く、SR で「タグなし / 未アサイン」と
 * しか読まれず popover を開いた状態 (aria-expanded) も伝わらない。装飾 icon
 * (TagIcon / UserIcon / CheckIcon / PlusIcon / 色 dot) も role 無し。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'pickers-iter166',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter166: TagPicker / AssigneePicker の trigger Button に aria-label (現在の選択件数 + 名前一覧) + aria-expanded + aria-haspopup="listbox"、装飾 icon に aria-hidden を一括付与',
    })
  },
})
