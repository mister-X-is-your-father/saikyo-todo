-- =====================================================================
-- Phase 6.1: AI 分解 staging — agent_decompose_proposals
-- =====================================================================
-- Researcher が `propose_child_item` ツールを呼ぶたびに 1 行 INSERT (status='pending')。
-- ユーザーが UI で行ごとに採用 / 却下 / 編集 → accepted で items に実 INSERT、
-- accepted_item_id にその id をセット。rejected は単に status のみ更新 (audit_log で残す)。
-- =====================================================================

create table if not exists public.agent_decompose_proposals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  parent_item_id uuid not null references public.items(id) on delete cascade,
  agent_invocation_id uuid references public.agent_invocations(id) on delete set null,
  title text not null,
  description text not null default '',
  is_must boolean not null default false,
  dod text,
  status_proposal text not null default 'pending',
  accepted_item_id uuid references public.items(id) on delete set null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  constraint agent_decompose_proposals_status_chk
    check (status_proposal in ('pending', 'accepted', 'rejected')),
  constraint agent_decompose_proposals_must_dod_chk
    check (is_must = false or (dod is not null and length(trim(dod)) > 0))
);

create index if not exists agent_decompose_proposals_parent_idx
  on public.agent_decompose_proposals (parent_item_id, status_proposal);

create index if not exists agent_decompose_proposals_workspace_idx
  on public.agent_decompose_proposals (workspace_id, created_at);

create index if not exists agent_decompose_proposals_invocation_idx
  on public.agent_decompose_proposals (agent_invocation_id);

-- ---------------------------------------------------------------------
-- RLS: workspace member 全員が閲覧 / 採用 / 却下できる (Agent は service_role bypass)。
-- ---------------------------------------------------------------------
alter table public.agent_decompose_proposals enable row level security;

create policy "agent_decompose_proposals: workspace read"
on public.agent_decompose_proposals for select
to authenticated
using (is_workspace_member(workspace_id));

-- INSERT は通常 Agent (service_role) のみだが、UI から手動追加もできるように member 以上に開放
create policy "agent_decompose_proposals: workspace insert"
on public.agent_decompose_proposals for insert
to authenticated
with check (has_workspace_role(workspace_id, 'member'));

create policy "agent_decompose_proposals: workspace update"
on public.agent_decompose_proposals for update
to authenticated
using (has_workspace_role(workspace_id, 'member'))
with check (has_workspace_role(workspace_id, 'member'));

-- DELETE policy なし (rejected で論理消去)
