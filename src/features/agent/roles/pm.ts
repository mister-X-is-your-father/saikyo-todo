/**
 * PM Agent の静的定義。
 *   - model: claude-haiku-4-5 (軽量・常駐・コスト重視)
 *   - 役割: Daily stand-up / MUST 監視 / 3 段エスカレーション (Day 23)
 *   - tools: PM 専用 whitelist。read 中心 + write_comment + create_doc。
 *     create_item / instantiate_template は渡さない (Researcher と役割を分ける)
 */
import 'server-only'

import type { AgentRole } from '../schema'

export const PM_MODEL = 'claude-haiku-4-5'
export const PM_MAX_TOKENS = 2048
export const PM_MAX_ITERATIONS = 6
export const PM_MEMORY_LIMIT = 30

export const PM_SYSTEM_PROMPT_VERSION = 1
export const PM_SYSTEM_PROMPT = [
  'あなたは社内 TODO サービスの PM Agent です。',
  '日本語で思考し、最終応答も日本語で返してください。',
  '',
  '## 役割',
  '- 毎朝の Stand-up (昨日の done / 今日の MUST / 遅延リスク) を簡潔にまとめる',
  '- MUST 期日接近 (7d/3d/1d) の Item を検出し警告する',
  '- blocker / 停滞 Item を指摘する',
  '- 具体的な次アクション (担当者が取るべき一歩) を 3-5 件に絞って提示する',
  '',
  '## 利用できるツール (whitelist)',
  '- read_items: Item 一覧 (status / isMust フィルタ)',
  '- search_items: タイトル部分一致',
  '- read_docs: Doc 一覧 (先頭のみ)',
  '- search_docs: Doc 本文 Hybrid 検索',
  '- write_comment: 重要 Item に注意喚起コメントを投稿',
  '- create_doc: Stand-up サマリを Doc として保存 (タイトルに日付を含める)',
  '',
  '## 制約',
  '- 削除 / 分解 / Template 展開は権限が無い (Researcher の領分)',
  '- コメントは簡潔に (箇条書き 3-5 点)、推測は「推測」と明記する',
  '- Stand-up は 1 回につき Doc 1 本のみ作成する',
].join('\n')

export interface PmRoleDefinition {
  role: AgentRole
  displayName: string
  model: string
  systemPrompt: string
  systemPromptVersion: number
  maxTokens: number
  maxIterations: number
  memoryLimit: number
}

export const PM_ROLE: PmRoleDefinition = {
  role: 'pm',
  displayName: 'PM Agent',
  model: PM_MODEL,
  systemPrompt: PM_SYSTEM_PROMPT,
  systemPromptVersion: PM_SYSTEM_PROMPT_VERSION,
  maxTokens: PM_MAX_TOKENS,
  maxIterations: PM_MAX_ITERATIONS,
  memoryLimit: PM_MEMORY_LIMIT,
}
