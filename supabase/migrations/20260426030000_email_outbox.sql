-- =====================================================================
-- Phase 6.6: Email notification pipeline (mock outbox)
-- =====================================================================
-- - notification_preferences: 既存定義 (userId+type+channel ユニーク) を破棄して
--   1 user 1 行 + email チャネルの 4 フラグ構造に置き換える。MVP では Service 層から
--   実利用されていなかったため drop & recreate で支障なし
-- - mock_email_outbox: dispatcher が writes するだけ。実 SMTP/Resend に置換するときは
--   src/features/email/dispatcher.ts のみ差し替える (テーブルはログとして残してもよい)
-- =====================================================================

-- 1) notification_preferences 置換
drop policy if exists "notification_preferences: own" on public.notification_preferences;
drop table if exists public.notification_preferences;

create table public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_for_heartbeat boolean not null default true,
  email_for_mention boolean not null default true,
  email_for_invite boolean not null default true,
  email_for_sync_failure boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

-- 自分の行のみ閲覧 / 作成 / 更新 (auth.uid() = user_id)
create policy "notification_preferences: own select"
on public.notification_preferences for select
to authenticated
using (user_id = auth.uid());

create policy "notification_preferences: own insert"
on public.notification_preferences for insert
to authenticated
with check (user_id = auth.uid());

create policy "notification_preferences: own update"
on public.notification_preferences for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- updated_at 自動更新トリガ (他テーブルと揃える)
create or replace function public.tg_notification_preferences_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

create trigger notification_preferences_set_updated_at
before update on public.notification_preferences
for each row execute function public.tg_notification_preferences_set_updated_at();

-- 2) mock_email_outbox
create table if not exists public.mock_email_outbox (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  to_email text not null,
  type text not null,
  subject text not null,
  html_body text not null,
  text_body text not null,
  created_at timestamptz not null default now(),
  dispatched_at timestamptz,
  error text
);

create index if not exists mock_email_outbox_user_idx
  on public.mock_email_outbox (user_id, created_at);

create index if not exists mock_email_outbox_workspace_idx
  on public.mock_email_outbox (workspace_id, created_at);

alter table public.mock_email_outbox enable row level security;

-- 自分宛のメールのみ閲覧 (workspace member 制約は不要 — user_id 一致で十分)
create policy "mock_email_outbox: own select"
on public.mock_email_outbox for select
to authenticated
using (user_id = auth.uid());

-- INSERT は service_role のみ (dispatcher は adminDb 経由)。authenticated には INSERT policy を付けない
