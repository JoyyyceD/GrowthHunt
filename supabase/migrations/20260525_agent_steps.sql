-- agent_steps — per-step trace of the ReAct loop.
create table if not exists public.agent_steps (
  id                uuid        primary key default gen_random_uuid(),
  workspace_id     uuid        not null references public.gtm_workspaces(id) on delete cascade,
  conversation_id  uuid        references public.gtm_conversations(id) on delete set null,
  turn_task_id     uuid        references public.gtm_tasks(id) on delete cascade,
  step_index       int         not null default 0,
  thought          text,
  action_kind      text        not null,
  tool_name        text,
  tool_params      jsonb,
  observation      text,
  task_id          uuid        references public.gtm_tasks(id) on delete set null,
  tokens_in        int,
  tokens_out       int,
  duration_ms      int,
  created_at       timestamptz not null default now()
);
create index if not exists agent_steps_turn_idx on public.agent_steps (turn_task_id, step_index);
create index if not exists agent_steps_workspace_idx on public.agent_steps (workspace_id, created_at desc);

alter table public.agent_steps enable row level security;
grant all on table public.agent_steps to service_role;
