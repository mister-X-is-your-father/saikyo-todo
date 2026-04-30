-- queue: REST API + MCP server 化 — api_keys table
-- 詳細: FEEDBACK_QUEUE.md "REST API + MCP server 化" entry

create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  label text not null,
  key_hash text not null,
  key_prefix text not null,
  scopes text[] not null default '{}',
  created_by_user_id uuid not null references auth.users(id) on delete cascade,
  last_used_at timestamptz,
  revoked_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index api_keys_key_hash_uniq on public.api_keys (key_hash);
create index api_keys_workspace_idx on public.api_keys (workspace_id);
create index api_keys_created_by_idx on public.api_keys (created_by_user_id);

-- RLS: workspace member は自 workspace の api_keys を SELECT 可、admin / owner は INSERT / UPDATE
alter table public.api_keys enable row level security;

create policy api_keys_select on public.api_keys
  for select to authenticated using (
    exists (
      select 1 from public.workspace_members m
      where m.workspace_id = api_keys.workspace_id
        and m.user_id = (select auth.uid())
    )
  );

create policy api_keys_insert on public.api_keys
  for insert to authenticated with check (
    created_by_user_id = (select auth.uid())
    and exists (
      select 1 from public.workspace_members m
      where m.workspace_id = api_keys.workspace_id
        and m.user_id = (select auth.uid())
        and m.role in ('owner', 'admin')
    )
  );

create policy api_keys_update on public.api_keys
  for update to authenticated using (
    exists (
      select 1 from public.workspace_members m
      where m.workspace_id = api_keys.workspace_id
        and m.user_id = (select auth.uid())
        and m.role in ('owner', 'admin')
    )
  );

-- updated_at trigger
create or replace function public.tg_api_keys_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger api_keys_set_updated_at
  before update on public.api_keys
  for each row execute function public.tg_api_keys_set_updated_at();
