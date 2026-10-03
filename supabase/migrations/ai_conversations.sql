-- Table pour stocker les conversations IA par utilisateur
-- À exécuter dans Supabase : Dashboard → SQL Editor → New Query → coller et Run

create table if not exists ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entreprise_id uuid not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now()
);

-- Index pour charger rapidement l'historique d'un utilisateur
create index if not exists idx_ai_conversations_user_id on ai_conversations(user_id, created_at desc);

-- RLS : chaque utilisateur ne voit que ses propres messages
alter table ai_conversations enable row level security;

create policy "Users can read their own conversations"
  on ai_conversations for select
  using (auth.uid() = user_id);

create policy "Users can insert their own conversations"
  on ai_conversations for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own conversations"
  on ai_conversations for delete
  using (auth.uid() = user_id);
