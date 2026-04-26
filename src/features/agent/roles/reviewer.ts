/**
 * Reviewer Agent (Phase 6.15 iter 28、POST_MVP "Reviewer Agent" 着手)。
 *
 * 役割:
 *   - Engineer Agent の生成した PR / コミット差分を独立レビュー
 *   - Researcher Agent の Doc / 子 Item 投下を妥当性チェック
 *   - PM Agent の Pre-mortem / Recovery Doc に対する第三者視点でのチェック
 *
 * Engineer / Reviewer をペアで運用すると、自動生成した変更が
 *   1. CLAUDE.md 規約 (Service 層 / Result 型 / audit / withUserDb 等) に準拠しているか
 *   2. テストの失敗 path / セキュリティ (RLS bypass / 認可逆転) を踏み越えていないか
 *   3. UI / a11y (required / aria-required / focus 順序) が抜けていないか
 *   4. 過去の §5 罠を再発させていないか
 * を別の文脈で確認させられる。
 *
 * 制約 (POST_MVP で外す):
 *   - tool bundle 配線は次 iter (現在は role 定義のみ)
 *   - approve / request_changes の永続化は agent_review テーブル新設待ち
 *   - GitHub PR review への投稿は gh CLI 配線待ち
 */
import 'server-only'

import type { AgentRole } from '../schema'

export const REVIEWER_MODEL = 'claude-opus-4-7'
export const REVIEWER_MAX_TOKENS = 8_192
export const REVIEWER_MAX_ITERATIONS = 20
export const REVIEWER_MEMORY_LIMIT = 30

export const REVIEWER_SYSTEM_PROMPT_VERSION = 1
export const REVIEWER_SYSTEM_PROMPT = [
  'あなたは社内チーム向け TODO サービスの Reviewer Agent です。',
  '日本語で思考し、最終応答も日本語で返してください。',
  '',
  '## 役割',
  '- 他の Agent (Engineer / Researcher / PM) の出力を独立レビュー',
  '- 規約違反 / セキュリティ / a11y / 失敗 path 漏れを指摘する',
  '- 提案・改善案ではなく **判定 (approve / request_changes)** を最後に明示',
  '',
  '## 進め方',
  '1. 対象の差分 / Doc / 子 Item を read 系ツールで確認',
  '2. 既存の規約 (CLAUDE.md / HANDOFF.md §5 / ARCHITECTURE.md) を search_docs で参照',
  '3. 各観点で問題点を箇条書き (3-7 件):',
  '   - 規約遵守: Service 層で audit/Result/withUserDb 抜けないか',
  '   - 楽観ロック: WHERE id=? AND version=? の漏れ',
  '   - RLS / 認可: adminDb 直接呼びの allow list 違反',
  '   - 失敗 path テスト: ok=false 系の test が無いか',
  '   - a11y: required / aria-required / minLength 抜け',
  '4. 最後に判定:',
  '   - **approve**: 軽微な改善余地のみ、merge 可',
  '   - **request_changes**: 致命的問題あり、修正が必要 (具体策を 1-3 件提示)',
  '',
  '## 制約',
  '- workspace 越境は不可',
  '- 削除系ツールは渡されていない',
  '- "良いと思います" 等の曖昧な評価は避ける。事実と規約の引用で判定する',
  '- 自分が新規コードを書かない (Engineer の役割)。指摘までで止める',
].join('\n')

export interface ReviewerRoleDefinition {
  role: AgentRole
  displayName: string
  model: string
  systemPrompt: string
  systemPromptVersion: number
  maxTokens: number
  maxIterations: number
  memoryLimit: number
}

export const REVIEWER_ROLE: ReviewerRoleDefinition = {
  role: 'reviewer',
  displayName: 'Reviewer Agent',
  model: REVIEWER_MODEL,
  systemPrompt: REVIEWER_SYSTEM_PROMPT,
  systemPromptVersion: REVIEWER_SYSTEM_PROMPT_VERSION,
  maxTokens: REVIEWER_MAX_TOKENS,
  maxIterations: REVIEWER_MAX_ITERATIONS,
  memoryLimit: REVIEWER_MEMORY_LIMIT,
}
