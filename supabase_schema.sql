-- Create profiles table
create table public.profiles (
  id uuid not null references auth.users(id) on delete cascade primary key,
  email text not null unique,
  full_name text,
  role text default 'employee' check (role in ('admin', 'employee')),
  status text default 'pending' check (status in ('pending', 'active')),
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Policies

-- 1. Users can view their own profile
create policy "Users can view own profile" 
on public.profiles for select 
using (auth.uid() = id);

-- 2. Users can update their own profile
-- (Ideally, we'd restrict columns, but RLS applies to the row)
create policy "Users can update own profile" 
on public.profiles for update 
using (auth.uid() = id);

-- 3. Admins can view all profiles
create policy "Admins can view all profiles" 
on public.profiles for select 
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  )
);

-- 4. Admins can update all profiles
create policy "Admins can update all profiles" 
on public.profiles for update 
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  )
);

-- Trigger to handle new user signups
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role, status)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    'employee', 
    'pending'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger execution
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
