-- =====================================================================
-- RLS 修正: SELECT policy から deleted_at IS NULL 制約を撤去
-- =====================================================================
-- 理由: Postgres は UPDATE 時に「新行が SELECT policy.using を満たすか」を
-- 暗黙チェックする。soft delete (deleted_at = NOW()) 後の新行は
-- `deleted_at IS NULL` を満たさず、"new row violates RLS" エラーになる。
--
-- 対策: SELECT policy から deleted_at filter を撤去。
--       Repository 層のクエリで `WHERE deleted_at IS NULL` を必ず付ける
--       (= 二重防御は Service/Repository 側で維持、RLS は workspace 制限のみ)。
-- =====================================================================

-- ---------- items ----------
alter policy "items: ws members read (active)" on public.items
  using (is_workspace_member(workspace_id));
alter policy "items: ws members update (active rows)" on public.items
  using (is_workspace_member(workspace_id) and deleted_at is null)
  with check (is_workspace_member(workspace_id));

-- ---------- docs ----------
alter policy "docs: ws members read (active)" on public.docs
  using (is_workspace_member(workspace_id));
alter policy "docs: ws members update (active rows)" on public.docs
  using (is_workspace_member(workspace_id) and deleted_at is null)
  with check (is_workspace_member(workspace_id));

-- ---------- templates ----------
alter policy "templates: ws members read (active)" on public.templates
  using (is_workspace_member(workspace_id));
alter policy "templates: ws members update (active rows)" on public.templates
  using (is_workspace_member(workspace_id) and deleted_at is null)
  with check (is_workspace_member(workspace_id));

-- ---------- workspaces ----------
alter policy "workspaces: members read (active)" on public.workspaces
  using (is_workspace_member(id));
alter policy "workspaces: owners update (active rows)" on public.workspaces
  using (owner_id = auth.uid() and deleted_at is null)
  with check (owner_id = auth.uid());

-- ---------- comments_on_items ----------
alter policy "comments_on_items: ws members read (active)" on public.comments_on_items
  using (
    exists (select 1 from public.items i
            where i.id = comments_on_items.item_id and is_workspace_member(i.workspace_id))
  );
alter policy "comments_on_items: ws members update (active rows)" on public.comments_on_items
  using (
    exists (select 1 from public.items i
            where i.id = comments_on_items.item_id and is_workspace_member(i.workspace_id))
    and deleted_at is null
  )
  with check (
    exists (select 1 from public.items i
            where i.id = comments_on_items.item_id and is_workspace_member(i.workspace_id))
  );

-- ---------- comments_on_docs ----------
alter policy "comments_on_docs: ws members read (active)" on public.comments_on_docs
  using (
    exists (select 1 from public.docs d
            where d.id = comments_on_docs.doc_id and is_workspace_member(d.workspace_id))
  );
alter policy "comments_on_docs: ws members update (active rows)" on public.comments_on_docs
  using (
    exists (select 1 from public.docs d
            where d.id = comments_on_docs.doc_id and is_workspace_member(d.workspace_id))
    and deleted_at is null
  )
  with check (
    exists (select 1 from public.docs d
            where d.id = comments_on_docs.doc_id and is_workspace_member(d.workspace_id))
  );
