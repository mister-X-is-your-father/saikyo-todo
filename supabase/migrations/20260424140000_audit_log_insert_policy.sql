-- =====================================================================
-- audit_log の INSERT policy 不足を修正
-- =====================================================================
-- 背景: 初回 RLS migration (20260424000000) は "書き込みは service_role のみ"
--       とコメントされていたが、実際の Service 層は withUserDb (authenticated
--       ロール) の Tx 内で recordAudit を呼ぶので、policy が無いと必ず失敗する。
--       itemService test (2026-04-24) で検出。
--
-- 修正: workspace member なら INSERT 可。actor_id の詐称は Service 層の
--       recordAudit 呼び出し側で担保 (actor_id = auth.uid() 限定は RLS で
--       強制しない — agent 書き込み時に actor_id は agent uuid になるため)。
-- =====================================================================

create policy "audit_log: members insert"
on public.audit_log for insert
to authenticated
with check (is_workspace_member(workspace_id));
