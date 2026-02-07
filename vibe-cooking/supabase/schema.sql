-- Create a customized enum for frequency
create type public.frequency_type as enum ('biweekly', 'monthly', 'rare');

-- Create the recipes table
create table public.recipes (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  url text,
  frequency frequency_type default 'monthly',
  child_rating integer check (child_rating >= 1 and child_rating <= 3),
  memo text,
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on Row Level Security (RLS) - Optional but recommended standard practice
alter table public.recipes enable row level security;

-- Create a policy that allows anyone to read/write for now (Prototype phase)
-- In a real app with auth, we would restrict this.
create policy "Allow public access"
on public.recipes
for all
using (true)
with check (true);
