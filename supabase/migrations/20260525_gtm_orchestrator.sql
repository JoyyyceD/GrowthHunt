-- GTM Orchestrator — single task ledger + chat conversations + messages.
-- Replaces the thin agent_runs table (empty, never written).

drop table if exists public.agent_runs;

-- gtm_conversations — chat threads (one per long-running dialogue)
create table if not exists public.gtm_conversations (
  id              uuid        primary key default gen_random_uuid(),
  workspace_id    uuid        not null references public.gtm_workspaces(id) on delete cascade,
  title           text        not null default 'New chat',
  created_at      timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);
create index if not exists gtm_conversations_workspace_idx
  on public.gtm_conversations (workspace_id, last_message_at desc);

-- gtm_tasks — single source of truth for every agent / playbook invocation
create table if not exists public.gtm_tasks (
  id              uuid        primary key default gen_random_uuid(),
  workspace_id    uuid        references public.gtm_workspaces(id) on delete cascade,
  conversation_id uuid        references public.gtm_conversations(id) on delete set null,
  parent_task_id  uuid        references public.gtm_tasks(id) on delete cascade,
  kind            text        not null,
  status          text        not null default 'pending',
  triggered_by    text        not null default 'manual',
  input           jsonb       not null default '{}'::jsonb,
  output          jsonb,
  summary         text,
  error           text,
  duration_ms     int,
  scheduled_for   timestamptz,
  started_at      timestamptz,
  finished_at     timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists gtm_tasks_workspace_idx     on public.gtm_tasks (workspace_id, created_at desc);
create index if not exists gtm_tasks_conversation_idx on public.gtm_tasks (conversation_id, created_at);
create index if not exists gtm_tasks_parent_idx       on public.gtm_tasks (parent_task_id);
create index if not exists gtm_tasks_due_idx          on public.gtm_tasks (scheduled_for) where status = 'pending';

-- gtm_messages — chat turns
create table if not exists public.gtm_messages (
  id              uuid        primary key default gen_random_uuid(),
  conversation_id uuid        not null references public.gtm_conversations(id) on delete cascade,
  role            text        not null,
  content         text        not null default '',
  tool_call       jsonb,
  task_id         uuid        references public.gtm_tasks(id) on delete set null,
  created_at      timestamptz not null default now()
);
create index if not exists gtm_messages_conversation_idx
  on public.gtm_messages (conversation_id, created_at);

create or replace function public.gtm_messages_touch_conversation()
returns trigger language plpgsql as $$
begin
  update public.gtm_conversations
    set last_message_at = new.created_at
    where id = new.conversation_id;
  return new;
end;
$$;
drop trigger if exists gtm_messages_bump_conv on public.gtm_messages;
create trigger gtm_messages_bump_conv
  after insert on public.gtm_messages
  for each row execute function public.gtm_messages_touch_conversation();

alter table public.gtm_conversations enable row level security;
alter table public.gtm_tasks         enable row level security;
alter table public.gtm_messages      enable row level security;

grant all on table public.gtm_conversations to service_role;
grant all on table public.gtm_tasks         to service_role;
grant all on table public.gtm_messages      to service_role;
