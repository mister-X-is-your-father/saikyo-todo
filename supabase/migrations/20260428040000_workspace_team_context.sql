-- Phase 6.15 iter128: workspace_settings に team_context (free text) を追加。
-- ユーザ要望「チームごとに分解した結果が違うはず。だからそのあたりもコンテキスト
--           与えられたりしないといけない。頼んだ。」
--
-- AI 経由 (Researcher / 各 Agent) のプロンプト末尾に常時 inject する free-text。
-- 例: "チームの方針: TDD。MUST タスクは PR 必須。Slack #team-x で進捗報告"
--
-- 大きすぎるとコスト跳ねるので max 4000 chars に制限 (zod 側でも同じ)。
alter table public.workspace_settings
  add column if not exists team_context text not null default '';

alter table public.workspace_settings
  add constraint workspace_settings_team_context_len_check
  check (char_length(team_context) <= 4000);
