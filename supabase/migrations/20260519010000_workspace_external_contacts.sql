-- queue: 連絡待ちモード WT-3 — workspace_external_contacts table
-- 詳細: ~/.claude/plans/saikyo-waiting-mode-plan.md §2.2
--
-- チーム外の人 (顧客 / 外部 PM / freelancer etc) を保存して連絡待ちの依頼先として再利用する。
-- workspace スコープ + soft delete + RLS (member 全員 read/write 可能)。

create table public.workspace_external_contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  email text,
  slack_user_id text,
  role text,
  note text,
  created_by uuid not null references auth.users(id) on delete cascade,
  deleted_at timestamptz,
  version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_ws_external_contacts_active
  on public.workspace_external_contacts (workspace_id)
  where deleted_at is null;

create index idx_ws_external_contacts_slack
  on public.workspace_external_contacts (workspace_id, slack_user_id)
  where deleted_at is null and slack_user_id is not null;

comment on table public.workspace_external_contacts is
  'チーム外の人帳。連絡待ち (waiting_for kind=external) の target として参照される。WT-3';

-- RLS: member 全員が CRUD 可、deleted は SELECT 不可
alter table public.workspace_external_contacts enable row level security;

create policy "external_contacts_select"
  on public.workspace_external_contacts for select
  using (
    deleted_at is null
    and exists (
      select 1 from public.workspace_members m
      where m.workspace_id = workspace_external_contacts.workspace_id
        and m.user_id = auth.uid()
    )
  );

create policy "external_contacts_insert"
  on public.workspace_external_contacts for insert
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.workspace_members m
      where m.workspace_id = workspace_external_contacts.workspace_id
        and m.user_id = auth.uid()
    )
  );

create policy "external_contacts_update"
  on public.workspace_external_contacts for update
  using (
    exists (
      select 1 from public.workspace_members m
      where m.workspace_id = workspace_external_contacts.workspace_id
        and m.user_id = auth.uid()
    )
  );

create policy "external_contacts_delete"
  on public.workspace_external_contacts for delete
  using (
    exists (
      select 1 from public.workspace_members m
      where m.workspace_id = workspace_external_contacts.workspace_id
        and m.user_id = auth.uid()
    )
  );
