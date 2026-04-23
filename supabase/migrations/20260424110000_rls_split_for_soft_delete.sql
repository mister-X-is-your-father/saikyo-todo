-- =====================================================================
-- RLS ポリシー再構成: soft delete を可能にするため for all を per-op に分離
-- =====================================================================
-- 元の policy "items: ws members rw" は `using (... AND deleted_at IS NULL)
-- with check (...)` だが、UPDATE で deleted_at をセットすると with check が
-- 失敗する事象を確認。SELECT に deleted_at IS NULL を残し、UPDATE は
-- workspace 制限のみとする per-op 分離が安全。
--
-- 同パターンを items / docs / templates / workspaces 全部に適用。
-- =====================================================================

-- ---------- items ----------
drop policy if exists "items: ws members rw" on public.items;

create policy "items: ws members read (active)"
on public.items for select to authenticated
using (is_workspace_member(workspace_id) and deleted_at is null);

create policy "items: ws members insert"
on public.items for insert to authenticated
with check (is_workspace_member(workspace_id));

create policy "items: ws members update (active rows)"
on public.items for update to authenticated
using (is_workspace_member(workspace_id) and deleted_at is null)
with check (is_workspace_member(workspace_id));

create policy "items: ws members delete (admin only via service)"
on public.items for delete to authenticated
using (false); -- hard delete は service_role 経由のみ

-- ---------- docs ----------
drop policy if exists "docs: ws members rw" on public.docs;

create policy "docs: ws members read (active)"
on public.docs for select to authenticated
using (is_workspace_member(workspace_id) and deleted_at is null);

create policy "docs: ws members insert"
on public.docs for insert to authenticated
with check (is_workspace_member(workspace_id));

create policy "docs: ws members update (active rows)"
on public.docs for update to authenticated
using (is_workspace_member(workspace_id) and deleted_at is null)
with check (is_workspace_member(workspace_id));

create policy "docs: ws members delete (admin only via service)"
on public.docs for delete to authenticated
using (false);

-- ---------- templates ----------
drop policy if exists "templates: ws members rw" on public.templates;

create policy "templates: ws members read (active)"
on public.templates for select to authenticated
using (is_workspace_member(workspace_id) and deleted_at is null);

create policy "templates: ws members insert"
on public.templates for insert to authenticated
with check (is_workspace_member(workspace_id));

create policy "templates: ws members update (active rows)"
on public.templates for update to authenticated
using (is_workspace_member(workspace_id) and deleted_at is null)
with check (is_workspace_member(workspace_id));

create policy "templates: ws members delete (admin only via service)"
on public.templates for delete to authenticated
using (false);

-- ---------- workspaces ----------
drop policy if exists "workspaces: members can read" on public.workspaces;
drop policy if exists "workspaces: owners can update" on public.workspaces;
drop policy if exists "workspaces: owners can delete (soft via UPDATE deleted_at)" on public.workspaces;

create policy "workspaces: members read (active)"
on public.workspaces for select to authenticated
using (is_workspace_member(id) and deleted_at is null);

create policy "workspaces: owners update (active rows)"
on public.workspaces for update to authenticated
using (owner_id = auth.uid() and deleted_at is null)
with check (owner_id = auth.uid());

create policy "workspaces: owners delete (admin only)"
on public.workspaces for delete to authenticated
using (false);

-- ---------- comments_on_items ----------
drop policy if exists "comments_on_items: ws members rw" on public.comments_on_items;

create policy "comments_on_items: ws members read (active)"
on public.comments_on_items for select to authenticated
using (
  exists (select 1 from public.items i where i.id = comments_on_items.item_id and is_workspace_member(i.workspace_id))
  and deleted_at is null
);

create policy "comments_on_items: ws members insert"
on public.comments_on_items for insert to authenticated
with check (
  exists (select 1 from public.items i where i.id = comments_on_items.item_id and is_workspace_member(i.workspace_id))
);

create policy "comments_on_items: ws members update (active rows)"
on public.comments_on_items for update to authenticated
using (
  exists (select 1 from public.items i where i.id = comments_on_items.item_id and is_workspace_member(i.workspace_id))
  and deleted_at is null
)
with check (
  exists (select 1 from public.items i where i.id = comments_on_items.item_id and is_workspace_member(i.workspace_id))
);

-- ---------- comments_on_docs ----------
drop policy if exists "comments_on_docs: ws members rw" on public.comments_on_docs;

create policy "comments_on_docs: ws members read (active)"
on public.comments_on_docs for select to authenticated
using (
  exists (select 1 from public.docs d where d.id = comments_on_docs.doc_id and is_workspace_member(d.workspace_id))
  and deleted_at is null
);

create policy "comments_on_docs: ws members insert"
on public.comments_on_docs for insert to authenticated
with check (
  exists (select 1 from public.docs d where d.id = comments_on_docs.doc_id and is_workspace_member(d.workspace_id))
);

create policy "comments_on_docs: ws members update (active rows)"
on public.comments_on_docs for update to authenticated
using (
  exists (select 1 from public.docs d where d.id = comments_on_docs.doc_id and is_workspace_member(d.workspace_id))
  and deleted_at is null
)
with check (
  exists (select 1 from public.docs d where d.id = comments_on_docs.doc_id and is_workspace_member(d.workspace_id))
);
