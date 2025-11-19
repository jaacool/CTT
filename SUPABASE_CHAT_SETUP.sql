-- ============================================
-- SUPABASE CHAT SETUP
-- ============================================
-- Tabellen, Indizes, RLS-Policies und Realtime

-- 1) Tabellen
create table if not exists chat_channels (
  id text primary key,
  name text not null,
  description text,
  type text not null check (type in ('GROUP','DIRECT')),
  is_private boolean default false,
  created_by text not null references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  data jsonb not null
);

create table if not exists chat_channel_members (
  channel_id text not null references chat_channels(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  primary key (channel_id, user_id)
);

create table if not exists chat_messages (
  id text primary key,
  channel_id text not null references chat_channels(id) on delete cascade,
  project_id text,
  sender_id text not null references users(id) on delete set null,
  content text not null,
  timestamp timestamptz not null default now(),
  data jsonb not null
);

-- 2) Trigger für updated_at
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at_chat_channels on chat_channels;
create trigger set_updated_at_chat_channels
before update on chat_channels
for each row execute function set_updated_at();

-- 3) Indizes
create index if not exists idx_chat_messages_channel_id on chat_messages(channel_id);
create index if not exists idx_chat_messages_project_id on chat_messages(project_id);
create index if not exists idx_chat_messages_timestamp on chat_messages(timestamp desc);

-- 4) RLS aktivieren
alter table chat_channels enable row level security;
alter table chat_channel_members enable row level security;
alter table chat_messages enable row level security;

-- Policies (offen für Prototyping – in Produktion restriktiver gestalten)
-- chat_channels
drop policy if exists "chat_channels_select" on chat_channels;
drop policy if exists "chat_channels_insert" on chat_channels;
drop policy if exists "chat_channels_update" on chat_channels;
drop policy if exists "chat_channels_delete" on chat_channels;

create policy "chat_channels_select" on chat_channels for select using (true);
create policy "chat_channels_insert" on chat_channels for insert with check (true);
create policy "chat_channels_update" on chat_channels for update using (true);
create policy "chat_channels_delete" on chat_channels for delete using (true);

-- chat_channel_members
drop policy if exists "chat_channel_members_select" on chat_channel_members;
drop policy if exists "chat_channel_members_insert" on chat_channel_members;
drop policy if exists "chat_channel_members_delete" on chat_channel_members;

create policy "chat_channel_members_select" on chat_channel_members for select using (true);
create policy "chat_channel_members_insert" on chat_channel_members for insert with check (true);
create policy "chat_channel_members_delete" on chat_channel_members for delete using (true);

-- chat_messages
drop policy if exists "chat_messages_select" on chat_messages;
drop policy if exists "chat_messages_insert" on chat_messages;
drop policy if exists "chat_messages_delete" on chat_messages;

create policy "chat_messages_select" on chat_messages for select using (true);
create policy "chat_messages_insert" on chat_messages for insert with check (true);
create policy "chat_messages_delete" on chat_messages for delete using (true);

-- 5) Realtime (Publication)
-- Diese Befehle ggf. im Dashboard aktivieren: Database → Replication → Realtime
-- ALTER PUBLICATION supabase_realtime ADD TABLE chat_channels;
-- ALTER PUBLICATION supabase_realtime ADD TABLE chat_channel_members;
-- ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
