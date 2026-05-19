/**
 * AI 自動実行モードの「Plan 生成」 user message builder (pure)。
 *
 * FEEDBACK_QUEUE.md P0「AI 自動実行モード」 scope A iter5 substrate。本 file は
 * pure 関数のみ (server-only 不要) で、test 単体で文字列出力を検証可能にする。
 *
 * 想定経路:
 *   (1) ユーザが AssigneePicker で AI を担当に設定 (iter509)
 *   (2) ItemEditDialog 上で「Plan を生成」 button を押す (次 iter)
 *   (3) Researcher tool bundle (read_items / search_items / search_docs +
 *       write_comment) で本 message を投げると、Researcher は plan を書き、
 *       本 Item の comment として post (write_comment 経由)
 *   (4) ユーザが comment を確認、「承認」 button で実行を許可 (将来)
 */

export interface PlanGenerationParams {
  itemId: string
  title: string
  description: string
  dod: string | null
  /** 任意の追加指示 (UI でユーザが書ける場合)。空文字 / 省略時は inject されない。 */
  extraHint?: string
}

/**
 * Plan の構造化フォーマット (これを守らせる):
 *   ## 目的 / 終わり方  (Item の DoD と整合する 1-3 文)
 *   ## アプローチ (番号付き 3-7 step、各 1-2 文で概要)
 *   ## リスク / 依存 (2-4 件、短く)
 *   ## 完了見込み (X〜Y 時間 / 日)
 *   ## 確認事項 (ユーザに尋ねたいことが有れば、無ければ "なし")
 *
 * 先頭に "🤖 実行計画 (案)" を入れる指示を最後に添える (UI で「承認」 button を
 * 出すための marker としても使える)。
 */
export function buildPlanGenerationUserMessage(params: PlanGenerationParams): string {
  const lines: string[] = []
  lines.push(
    '以下の Item は **AI 担当** に設定されました。実行する前に「実行計画 (Plan)」を作成し、',
  )
  lines.push('Item の comment として投稿してください (write_comment で post)。')
  lines.push('')
  lines.push(`- 対象 Item id: ${params.itemId}`)
  lines.push(`- タイトル: ${params.title}`)
  if (params.description.trim().length > 0) {
    lines.push('- 説明:')
    lines.push(params.description.trim())
  }
  if (params.dod && params.dod.trim().length > 0) {
    lines.push('- DoD (Definition of Done):')
    lines.push(params.dod.trim())
  }
  if (params.extraHint && params.extraHint.trim().length > 0) {
    lines.push('')
    lines.push('追加指示:')
    lines.push(params.extraHint.trim())
  }
  lines.push('')
  lines.push('手順:')
  lines.push('1. read_items で本 Item の詳細を確認 (parent / dueDate / 既存 comment の流れ)')
  lines.push('2. 必要なら search_items / search_docs で関連 Item / Doc を 2-3 件参照')
  lines.push('3. 以下の構造で **Plan** を Markdown で書く (本文は 300-1500 文字目安):')
  lines.push('   ## 目的 / 終わり方  (Item の DoD と整合する 1-3 文)')
  lines.push('   ## アプローチ (番号付き 3-7 step、各 1-2 文で概要)')
  lines.push('   ## リスク / 依存 (2-4 件、短く)')
  lines.push('   ## 完了見込み (X〜Y 時間 / 日)')
  lines.push('   ## 確認事項 (ユーザに尋ねたいことが有れば、無ければ "なし")')
  lines.push(
    '4. write_comment で **本 Item に** 上記 Plan を post (先頭に "🤖 実行計画 (案)" と書く)',
  )
  lines.push('5. 最後に日本語 2-3 行で「どんな Plan を投下したか」をサマリで返す')
  return lines.join('\n')
}

/** Plan comment の先頭 marker。UI 側で「承認/却下 button を出すかどうか」の判定にも使う。 */
export const PLAN_COMMENT_MARKER = '🤖 実行計画 (案)'

/**
 * Comment 本文が AI plan の comment かを判定 (= UI で承認 button を出すか)。
 * 先頭に marker があれば true。前後 whitespace は許容、別位置の marker は誤検知防止で false。
 */
export function isPlanComment(commentBody: string): boolean {
  return commentBody.trimStart().startsWith(PLAN_COMMENT_MARKER)
}

/**
 * iter1014 ai-automation: AI Review comment の先頭 marker (= handoff-phase.ts の
 * `hasAiReviewComment` 判定に使う sentinel)。`PLAN_COMMENT_MARKER` (= '🤖 実行計画 (案)')
 * と対称な「✅ レビュー結果」 marker、AI が item の DoD 達成 / 成果物 review を完了した
 * 時の comment 先頭に書く。
 *
 * getAiHandoffPhase (handoff-phase.ts) は signals.hasAiReviewComment を読むが、その
 * boolean を作る caller (= item の comment listing を読む service / repository) が
 * 「何を marker と見做すか」 を 1 文字列で固定するための source of truth。
 *
 * 用途:
 *   - service / repository で comments を走査して isReviewComment で marker 判定
 *   - UI で AI が出した review summary を folding 表示 (= 先頭 marker 行で identify)
 *   - Slack 通知「AI レビュー結果が出ました」 経路の sentinel
 */
export const REVIEW_COMMENT_MARKER = '✅ レビュー結果'

/**
 * iter1014 ai-automation: Comment 本文が AI review の comment かを判定。
 * `isPlanComment` と同 logic (= 先頭 marker、trimStart 許容、別位置 false)。
 *
 * getAiHandoffPhase の signals.hasAiReviewComment を組み立てる caller (= comment
 * listing を持つ service / repository) は `comments.some(c => isReviewComment(c.body))`
 * で boolean を作れる。
 */
export function isReviewComment(commentBody: string): boolean {
  return commentBody.trimStart().startsWith(REVIEW_COMMENT_MARKER)
}
