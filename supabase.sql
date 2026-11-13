-- Run this once in Supabase: SQL Editor > New query > paste > Run

create table projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text,
  description text,
  link text,
  cover_url text,
  cover_path text,
  files jsonb default '[]',
  created_at timestamptz default now()
);

create table inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  service text,
  preferred_date date,
  message text not null,
  created_at timestamptz default now()
);

alter table projects enable row level security;
alter table inquiries enable row level security;

-- Visitors can read projects. Only the logged-in admin can change them.
create policy "public read projects" on projects for select using (true);
create policy "admin write projects" on projects for all to authenticated using (true) with check (true);

-- Visitors can send inquiries but cannot read them. Only admin can read/delete.
create policy "anyone can inquire" on inquiries for insert to anon, authenticated with check (true);
create policy "admin read inquiries" on inquiries for select to authenticated using (true);
create policy "admin delete inquiries" on inquiries for delete to authenticated using (true);

-- File storage bucket
insert into storage.buckets (id, name, public) values ('project-files', 'project-files', true) on conflict do nothing;
create policy "public read files" on storage.objects for select using (bucket_id = 'project-files');
create policy "admin upload files" on storage.objects for insert to authenticated with check (bucket_id = 'project-files');
create policy "admin delete files" on storage.objects for delete to authenticated using (bucket_id = 'project-files');