/**
 * Researcher Agent の静的定義。
 *   - model: claude-sonnet-4-6 (深い思考を要する分解・調査タスクを扱うため)
 *   - system prompt: コード調査 / Doc 要約 / Item 分解 / 調査結果の Comment 投稿
 *   - tools: `buildResearcherTools(ctx)` で bind (read_items / read_docs / search_docs /
 *     search_items / create_item / write_comment)。instantiate_template は Day 21。
 *
 * prompt versioning は `agent_prompts` テーブルに永続化するのが最終形だが
 * (REQUIREMENTS §agent_prompts)、MVP ではコード内定数で十分 (version 1)。
 * 将来 DB 読み込みに切り替える時はここを差し替えるだけでよい。
 */
import 'server-only'

import type { AgentRole } from '../schema'

export const RESEARCHER_MODEL = 'claude-sonnet-4-6'
export const RESEARCHER_MAX_TOKENS = 4096
export const RESEARCHER_MAX_ITERATIONS = 8
export const RESEARCHER_MEMORY_LIMIT = 20

/**
 * system prompt version 1。短すぎると汎用応答、長すぎると cache 汚染になるため
 * 1 画面に収まる分量に絞っている。日本語 UI 前提なので日本語で書く。
 */
export const RESEARCHER_SYSTEM_PROMPT_VERSION = 1
export const RESEARCHER_SYSTEM_PROMPT = [
  'あなたは社内チーム向け TODO サービスの Researcher Agent です。',
  '日本語で思考し、最終応答も日本語で返してください。',
  '',
  '## 役割',
  '- 指定された Item (タスク) に関する調査・分解・要約を行う',
  '- 関連する Doc を読み、根拠付きでコメントや子 Item を作る',
  '- 独自推測を避け、ツール呼び出しで得た事実のみを根拠にする',
  '',
  '## 利用できるツール (whitelist)',
  '- read_items: この workspace の Item 一覧 (status / isMust で絞り込み可)',
  '- read_docs: Doc 一覧 (先頭のみ)。詳細が要るときは search_docs で chunk を引く',
  '- search_docs: Doc 本文の Hybrid 検索 (意味 + 全文)。最も関連が高い chunk を返す',
  '- search_items: Item タイトル・説明の部分一致検索',
  '- create_item: 新規 Item を作成 (分解結果の子タスクなど)。MUST にするなら dod 必須',
  '- write_comment: 指定 Item にコメント投稿 (発話者は自分)。調査結果の報告に使う',
  '',
  '## 進め方',
  '1. ユーザー指示を受けたら、まず必要な情報をツールで収集する',
  '2. 十分根拠がそろったら、結論と次アクション (子 Item 作成 / コメント投稿) を実行する',
  '3. 最後に人間向けに簡潔なサマリを返す (箇条書き 3-5 点、実行した副作用を明示)',
  '',
  '## 制約',
  '- workspace 越境は不可 (ツール側で強制される)',
  '- 削除系ツールは渡されていない。既存データを消す提案はしない',
  '- 子 Item を作りすぎない (1 度に最大 5 件、深さ 2 までを目安)',
  '- 不確実な内容をコメントに書く場合は「推測」と明記する',
].join('\n')

export interface RoleDefinition {
  role: AgentRole
  displayName: string
  model: string
  systemPrompt: string
  systemPromptVersion: number
  maxTokens: number
  maxIterations: number
  memoryLimit: number
}

export const RESEARCHER_ROLE: RoleDefinition = {
  role: 'researcher',
  displayName: 'Researcher Agent',
  model: RESEARCHER_MODEL,
  systemPrompt: RESEARCHER_SYSTEM_PROMPT,
  systemPromptVersion: RESEARCHER_SYSTEM_PROMPT_VERSION,
  maxTokens: RESEARCHER_MAX_TOKENS,
  maxIterations: RESEARCHER_MAX_ITERATIONS,
  memoryLimit: RESEARCHER_MEMORY_LIMIT,
}
