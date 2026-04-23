-- =====================================================================
-- RLS (Row Level Security) ポリシー
-- =====================================================================
-- 方針 (ARCHITECTURE.md §16): Service 層 guard が一次防御 + RLS が二次防御。
-- RLS は基本「workspace_members に居るか?」を見るだけのシンプルな構成。
--
-- なぜ Drizzle 生成と分離するか:
--  - Drizzle Kit は RLS をサポートしていない (テーブル定義のみ生成)
--  - RLS は SQL 直書きが最もメンテしやすい
--  - 番号 prefix `20260424...` で Drizzle 生成 (`20260423...`) より後に実行される
-- =====================================================================

-- ---------- helpers ----------
-- workspace_members に居るかを判定。SECURITY DEFINER で workspace_members 自体の
-- RLS をバイパス (循環防止)。
create or replace function public.is_workspace_member(ws_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws_id
      and user_id = auth.uid()
  )
$$;

create or replace function public.workspace_role(ws_id uuid)
returns workspace_member_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.workspace_members
  where workspace_id = ws_id and user_id = auth.uid()
  limit 1
$$;

create or replace function public.has_workspace_role(ws_id uuid, required workspace_member_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case workspace_role(ws_id)
    when 'owner' then true
    when 'admin' then required in ('admin','member','viewer')
    when 'member' then required in ('member','viewer')
    when 'viewer' then required = 'viewer'
    else false
  end
$$;

-- ---------- workspaces ----------
alter table public.workspaces enable row level security;

create policy "workspaces: members can read"
on public.workspaces for select
to authenticated
using (is_workspace_member(id) and deleted_at is null);

create policy "workspaces: owners can insert"
on public.workspaces for insert
to authenticated
with check (owner_id = auth.uid());

create policy "workspaces: owners can update"
on public.workspaces for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "workspaces: owners can delete (soft via UPDATE deleted_at)"
on public.workspaces for delete
to authenticated
using (owner_id = auth.uid());

-- ---------- workspace_members ----------
alter table public.workspace_members enable row level security;

create policy "workspace_members: members can read same-ws members"
on public.workspace_members for select
to authenticated
using (is_workspace_member(workspace_id));

create policy "workspace_members: admins can manage"
on public.workspace_members for all
to authenticated
using (has_workspace_role(workspace_id, 'admin'))
with check (has_workspace_role(workspace_id, 'admin'));

-- ---------- workspace_settings / workspace_statuses ----------
alter table public.workspace_settings enable row level security;
create policy "workspace_settings: members read"
on public.workspace_settings for select
to authenticated using (is_workspace_member(workspace_id));
create policy "workspace_settings: admins write"
on public.workspace_settings for all
to authenticated
using (has_workspace_role(workspace_id, 'admin'))
with check (has_workspace_role(workspace_id, 'admin'));

alter table public.workspace_statuses enable row level security;
create policy "workspace_statuses: members read"
on public.workspace_statuses for select
to authenticated using (is_workspace_member(workspace_id));
create policy "workspace_statuses: admins write"
on public.workspace_statuses for all
to authenticated
using (has_workspace_role(workspace_id, 'admin'))
with check (has_workspace_role(workspace_id, 'admin'));

alter table public.workspace_invitations enable row level security;
create policy "workspace_invitations: admins manage"
on public.workspace_invitations for all
to authenticated
using (has_workspace_role(workspace_id, 'admin'))
with check (has_workspace_role(workspace_id, 'admin'));

-- ---------- profiles ----------
alter table public.profiles enable row level security;
-- 自分のプロファイルは常に読める / 編集できる
create policy "profiles: own read" on public.profiles for select to authenticated using (id = auth.uid());
create policy "profiles: own update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles: own insert" on public.profiles for insert to authenticated with check (id = auth.uid());
-- 同じ workspace のメンバーのプロファイルも読める (アバター表示等のため)
create policy "profiles: same-ws members read"
on public.profiles for select
to authenticated
using (
  exists (
    select 1 from public.workspace_members wm1, public.workspace_members wm2
    where wm1.user_id = auth.uid()
      and wm2.user_id = profiles.id
      and wm1.workspace_id = wm2.workspace_id
  )
);

-- ---------- items + 関連 ----------
alter table public.items enable row level security;
create policy "items: ws members rw"
on public.items for all
to authenticated
using (is_workspace_member(workspace_id) and deleted_at is null)
with check (is_workspace_member(workspace_id));

alter table public.item_assignees enable row level security;
create policy "item_assignees: ws members rw"
on public.item_assignees for all
to authenticated
using (
  exists (
    select 1 from public.items i
    where i.id = item_assignees.item_id and is_workspace_member(i.workspace_id)
  )
)
with check (
  exists (
    select 1 from public.items i
    where i.id = item_assignees.item_id and is_workspace_member(i.workspace_id)
  )
);

alter table public.tags enable row level security;
create policy "tags: ws members rw"
on public.tags for all
to authenticated
using (is_workspace_member(workspace_id))
with check (is_workspace_member(workspace_id));

alter table public.item_tags enable row level security;
create policy "item_tags: ws members rw"
on public.item_tags for all
to authenticated
using (
  exists (
    select 1 from public.items i
    where i.id = item_tags.item_id and is_workspace_member(i.workspace_id)
  )
)
with check (
  exists (
    select 1 from public.items i
    where i.id = item_tags.item_id and is_workspace_member(i.workspace_id)
  )
);

alter table public.item_dependencies enable row level security;
create policy "item_dependencies: ws members rw"
on public.item_dependencies for all
to authenticated
using (
  exists (
    select 1 from public.items i
    where i.id = item_dependencies.from_item_id and is_workspace_member(i.workspace_id)
  )
)
with check (
  exists (
    select 1 from public.items i
    where i.id = item_dependencies.from_item_id and is_workspace_member(i.workspace_id)
  )
);

-- ---------- docs + chunks ----------
alter table public.docs enable row level security;
create policy "docs: ws members rw"
on public.docs for all
to authenticated
using (is_workspace_member(workspace_id) and deleted_at is null)
with check (is_workspace_member(workspace_id));

alter table public.doc_chunks enable row level security;
create policy "doc_chunks: ws members rw"
on public.doc_chunks for all
to authenticated
using (
  exists (
    select 1 from public.docs d
    where d.id = doc_chunks.doc_id and is_workspace_member(d.workspace_id)
  )
)
with check (
  exists (
    select 1 from public.docs d
    where d.id = doc_chunks.doc_id and is_workspace_member(d.workspace_id)
  )
);

-- ---------- comments ----------
alter table public.comments_on_items enable row level security;
create policy "comments_on_items: ws members rw"
on public.comments_on_items for all
to authenticated
using (
  exists (
    select 1 from public.items i
    where i.id = comments_on_items.item_id and is_workspace_member(i.workspace_id)
  )
)
with check (
  exists (
    select 1 from public.items i
    where i.id = comments_on_items.item_id and is_workspace_member(i.workspace_id)
  )
);

alter table public.comments_on_docs enable row level security;
create policy "comments_on_docs: ws members rw"
on public.comments_on_docs for all
to authenticated
using (
  exists (
    select 1 from public.docs d
    where d.id = comments_on_docs.doc_id and is_workspace_member(d.workspace_id)
  )
)
with check (
  exists (
    select 1 from public.docs d
    where d.id = comments_on_docs.doc_id and is_workspace_member(d.workspace_id)
  )
);

-- ---------- templates ----------
alter table public.templates enable row level security;
create policy "templates: ws members rw"
on public.templates for all
to authenticated
using (is_workspace_member(workspace_id) and deleted_at is null)
with check (is_workspace_member(workspace_id));

alter table public.template_items enable row level security;
create policy "template_items: ws members rw"
on public.template_items for all
to authenticated
using (
  exists (
    select 1 from public.templates t
    where t.id = template_items.template_id and is_workspace_member(t.workspace_id)
  )
)
with check (
  exists (
    select 1 from public.templates t
    where t.id = template_items.template_id and is_workspace_member(t.workspace_id)
  )
);

alter table public.template_docs enable row level security;
create policy "template_docs: ws members rw"
on public.template_docs for all
to authenticated
using (
  exists (
    select 1 from public.templates t
    where t.id = template_docs.template_id and is_workspace_member(t.workspace_id)
  )
)
with check (
  exists (
    select 1 from public.templates t
    where t.id = template_docs.template_id and is_workspace_member(t.workspace_id)
  )
);

alter table public.template_instantiations enable row level security;
create policy "template_instantiations: ws members rw"
on public.template_instantiations for all
to authenticated
using (
  exists (
    select 1 from public.templates t
    where t.id = template_instantiations.template_id and is_workspace_member(t.workspace_id)
  )
)
with check (
  exists (
    select 1 from public.templates t
    where t.id = template_instantiations.template_id and is_workspace_member(t.workspace_id)
  )
);

-- ---------- agents ----------
alter table public.agents enable row level security;
create policy "agents: ws members read"
on public.agents for select
to authenticated using (is_workspace_member(workspace_id));
create policy "agents: admins write"
on public.agents for all
to authenticated
using (has_workspace_role(workspace_id, 'admin'))
with check (has_workspace_role(workspace_id, 'admin'));

alter table public.agent_prompts enable row level security;
-- prompt はグローバル (workspace に紐付かない) → 全員 read 可、書き込みは service_role 経由のみ
create policy "agent_prompts: all read"
on public.agent_prompts for select
to authenticated using (true);

alter table public.agent_memories enable row level security;
create policy "agent_memories: ws members read"
on public.agent_memories for select
to authenticated
using (
  exists (
    select 1 from public.agents a
    where a.id = agent_memories.agent_id and is_workspace_member(a.workspace_id)
  )
);
-- 書き込みは worker (service_role) のみ → INSERT/UPDATE/DELETE policy なし

alter table public.agent_invocations enable row level security;
create policy "agent_invocations: ws members read"
on public.agent_invocations for select
to authenticated using (is_workspace_member(workspace_id));
create policy "agent_invocations: ws members enqueue"
on public.agent_invocations for insert
to authenticated with check (is_workspace_member(workspace_id));
-- worker (service_role) が UPDATE で進捗を書く

-- ---------- audit_log ----------
alter table public.audit_log enable row level security;
-- workspace 内 admin のみ閲覧
create policy "audit_log: admins read"
on public.audit_log for select
to authenticated
using (has_workspace_role(workspace_id, 'admin'));
-- 書き込みは Service 層 (service_role) のみ

-- ---------- notifications ----------
alter table public.notifications enable row level security;
create policy "notifications: own read/update"
on public.notifications for select
to authenticated using (user_id = auth.uid());
create policy "notifications: own mark read"
on public.notifications for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
-- INSERT は service_role 経由のみ

alter table public.notification_preferences enable row level security;
create policy "notification_preferences: own"
on public.notification_preferences for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
