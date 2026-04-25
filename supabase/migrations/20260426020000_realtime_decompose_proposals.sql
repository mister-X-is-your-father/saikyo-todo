-- ================================================================
-- Phase 6.2: Realtime publication for decompose proposals + invocations
-- ================================================================
-- - agent_decompose_proposals: Agent が propose_child_item を呼ぶたびに INSERT が走るので
--   購読すると Researcher の作業が live で UI に流れる
-- - agent_invocations: queued → running → completed の状態遷移と、
--   streaming output (output jsonb の streamingText を逐次 UPDATE) を購読
--
-- どちらも RLS が効くので、購読側は workspace member の自分関連のみ受信する。
-- ================================================================

alter table public.agent_decompose_proposals replica identity full;
alter table public.agent_invocations replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.agent_decompose_proposals;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.agent_invocations;
  exception when duplicate_object then null;
  end;
end$$;
