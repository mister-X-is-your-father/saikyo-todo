/**
 * Engineer Agent (Phase 6.12)。
 *
 * 役割:
 *   - Item を起点にコード変更を行い、PR (Draft) を起票する
 *   - git worktree で隔離された clone 上で作業 (本体ブランチを汚さない)
 *   - claude CLI を subprocess で呼ぶ (Max プラン OAuth、ANTHROPIC_API_KEY 不要)
 *   - 自前 MCP tool は渡さない (Read/Edit/Bash 等の標準ツールのみ。codebase 調査は CLI に委譲)
 *
 * 制約 (POST_MVP で外す):
 *   - 1 Item = 1 PR (Vibe Kanban 風の N 並列は POST_MVP)
 *   - Reviewer Agent / 二重承認は無し (人間 review 必須)
 *   - delete 系の destructive な変更は CLI レベルで拒否
 *   - target ブランチは main 固定 (multi-branch 戦略は POST_MVP)
 */
import 'server-only'

import type { AgentRole } from '../schema'

export const ENGINEER_MODEL = 'claude-opus-4-7'
export const ENGINEER_MAX_TOKENS = 16_384
export const ENGINEER_MAX_ITERATIONS = 40
export const ENGINEER_MEMORY_LIMIT = 40

export const ENGINEER_SYSTEM_PROMPT_VERSION = 1
export const ENGINEER_SYSTEM_PROMPT = [
  'あなたは社内チーム向け TODO サービスの Engineer Agent です。',
  '日本語で思考し、最終応答も日本語で返してください。',
  '',
  '## 役割',
  '- 与えられた Item (タスク) を実現するコード変更を行う',
  '- git worktree 内で作業しているため、自由にファイルを read/edit/create してよい',
  '- 完成したらコミットせず、変更を残したまま return する (commit + PR 起票は呼び出し側)',
  '',
  '## 進め方',
  '1. まず関連ファイルを Read / Grep / Glob で調査し、既存パターンを掴む',
  '2. CLAUDE.md があれば必ず読む (規約遵守)',
  '3. 必要な変更を最小範囲で実装する。リファクタや先回り対応は避ける',
  '4. テストがある領域なら必ず追加 / 既存テストを通す',
  '5. typecheck / lint / 関連 unit test を実行して通すこと',
  '6. 最後に「何を変えたか」「動作確認した内容」「人間レビュー必要箇所」を 5-10 行でまとめる',
  '',
  '## 制約',
  '- 物理削除 (rm) / git reset --hard / 既存 migration の改変は禁止',
  '- 環境変数 / シークレットを print / commit しない',
  '- 仕様が不明な場合は最小ライン (動く最小実装) で止め、レビューに委ねる',
  '- 既存ファイル編集を優先。新規 README / docs は要求がない限り作らない',
].join('\n')

export interface EngineerRoleDefinition {
  role: AgentRole
  displayName: string
  model: string
  systemPrompt: string
  systemPromptVersion: number
  maxTokens: number
  maxIterations: number
  memoryLimit: number
}

export const ENGINEER_ROLE: EngineerRoleDefinition = {
  role: 'engineer',
  displayName: 'Engineer Agent',
  model: ENGINEER_MODEL,
  systemPrompt: ENGINEER_SYSTEM_PROMPT,
  systemPromptVersion: ENGINEER_SYSTEM_PROMPT_VERSION,
  maxTokens: ENGINEER_MAX_TOKENS,
  maxIterations: ENGINEER_MAX_ITERATIONS,
  memoryLimit: ENGINEER_MEMORY_LIMIT,
}
