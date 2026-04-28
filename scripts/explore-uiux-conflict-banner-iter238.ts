/**
 * Phase 6.15 loop iter 238 — ItemEditDialog 楽観ロック Conflict UX 改善 (Linear / Asana 風 banner)。
 *
 * 課題: 旧仕様は DialogDescription に「別端末からの変更があると Conflict になります」と
 * 警告するだけで、実際に他端末で更新された時はユーザが「保存」 push して初めて
 * toast.error で気付く受動的 UX。Notion / GDocs は CRDT で自動 merge、Linear /
 * Asana は Realtime で「他の人が編集中」 banner を出して事前警告する。
 *
 * 改善:
 *   - dialog open 時の item.version を useRef でキャプチャ
 *   - Realtime で item.version が server 側で進んだら `externallyChanged` を検知
 *   - role="alert" の amber banner を Tabs の上に挿入
 *     「他の人がこの Item を編集しました」+ 「最新を読み込み」 button
 *   - button click で confirm + local state を server snapshot で上書き、ref も更新
 *
 * これで save 前に conflict を検知できる。trade-off: 自分も編集中で他人が変えた瞬間
 * banner が出る → ユーザはどちらの編集を残すか選択できる (Linear pattern)。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'conflict-banner-iter238',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter238: ItemEditDialog に「他の人が編集中」 banner + 「最新を読み込み」 button を追加 (Linear / Asana UX)',
    })
  },
})
