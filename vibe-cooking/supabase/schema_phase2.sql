-- Phase 2: 週間献立機能用スキーマ

-- 1. Enum型の作成
create type public.day_type_enum as enum ('work', 'home');
create type public.slot_type_enum as enum ('main', 'side', 'soup');

-- 2. 週間献立テーブルの作成
create table public.weekly_plan (
  id uuid default gen_random_uuid() primary key,
  date date not null,
  day_type day_type_enum default 'work',
  slot_type slot_type_enum not null,
  recipe_id uuid references public.recipes(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- 同じ日の同じスロット（主菜など）に複数のレシピが入ることを許容するか？
  -- 一旦ユニーク制約はつけず、柔軟にしておく
  constraint valid_date_check check (date > '2020-01-01')
);

-- 3. RLSの設定（プロトタイプ用：全公開）
alter table public.weekly_plan enable row level security;
create policy "Allow public access for weekly_plan" on public.weekly_plan for all using (true) with check (true);
