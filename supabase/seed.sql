-- Manual Ajax member roster for M0 (no Wellyx gate).
insert into public.member_roster (tenant_id, email, full_name, status)
values
  ('11111111-1111-1111-1111-111111111111', 'david@ajaxgym.com', 'David Mills', 'active'),
  ('11111111-1111-1111-1111-111111111111', 'seth@ajaxgym.com', 'Seth', 'active'),
  ('11111111-1111-1111-1111-111111111111', 'member@ajax.local', 'Demo Member', 'active')
on conflict (tenant_id, email) do update
  set full_name = excluded.full_name,
      status = excluded.status;
