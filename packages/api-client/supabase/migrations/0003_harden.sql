-- ═══════════════════════════════════════════════════════════════════════════
-- 0003 — security hardening. Run after 0002 on any project that already ran
-- 0001 and 0002.
--
-- Closes what every signed-in staff member could read or change:
--   · pin_hash — a fast SHA-256 of a 4-digit PIN with a fixed public salt, so
--     any staff member could recover a PIN in milliseconds. PINs now stay on
--     the device that set them; the column is dropped.
--   · supervisorPin in store_settings — a plaintext secret in a table every
--     staff login can read. Removed from the synced document.
--   · materials.stock_by_branch — every branch's stock visible to every
--     manager. Per-branch levels move to material_stock, branch-scoped.
--   · the staff roster — visible across branches.
--
-- Fixes sync blockers found by checking the POS flows:
--   · balances are sums of the movement ledger, so deductions from two offline
--     tills add up instead of overwriting each other
--   · handlers ring up sales and cashiers log material use at the register
--   · every POS role uses the customer picker
-- ═══════════════════════════════════════════════════════════════════════════

update store_settings set payload = payload - 'supervisorPin' where id = 'default';

alter table staff_users drop column pin_hash;

drop policy if exists staff_read on staff_users;
create policy staff_read on staff_users for select
  using (is_admin() or branch_id = my_branch());

create table material_stock (
  material_id text not null references materials(id) on delete cascade,
  branch_id   text not null references branches(id),
  qty         numeric(12,2) not null default 0,
  updated_at  timestamptz not null default now(),
  version     integer not null default 1,
  primary key (material_id, branch_id)
);

create trigger material_stock_touch before update on material_stock
  for each row execute function touch_updated_at();

create or replace function apply_stock_movement()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into material_stock (material_id, branch_id, qty)
  values (new.material_id, new.branch_id, new.qty)
  on conflict (material_id, branch_id)
  do update set qty = material_stock.qty + excluded.qty;
  return new;
end $$;

create trigger stock_movements_apply after insert on stock_movements
  for each row execute function apply_stock_movement();

insert into stock_movements (id, material_id, branch_id, kind, qty, reason, employee_id, employee_name)
select 'open-' || m.id || '-' || b.key, m.id, b.key, 'opening', b.value::numeric,
       'Carried over from per-branch stock', 'u-admin', 'System migration'
from materials m, jsonb_each_text(m.stock_by_branch) b
where b.key in (select id from branches) and b.value::numeric <> 0;

alter table materials drop column stock_by_branch;
alter table materials drop column stock_qty;

alter table material_stock enable row level security;
create policy material_stock_read on material_stock for select
  using (is_admin() or branch_id = my_branch());

drop policy if exists sales_insert on sales;
create policy sales_insert on sales for insert
  with check (is_admin() or (my_role() in ('manager','cashier','handler') and branch_id = my_branch()));

drop policy if exists movements_insert on stock_movements;
create policy movements_insert on stock_movements for insert
  with check (is_admin() or (branch_id = my_branch() and (
    my_role() = 'manager'
    or (my_role() in ('cashier','handler') and kind in ('consumed','void_reversal'))
  )));

drop policy if exists customers_read on customers;
drop policy if exists customers_write on customers;
create policy customers_read on customers for select
  using (my_role() <> 'anonymous');
create policy customers_insert on customers for insert
  with check (my_role() <> 'anonymous');
create policy customers_update on customers for update
  using (my_role() <> 'anonymous') with check (my_role() <> 'anonymous');
create policy customers_delete on customers for delete
  using (my_role() in ('super_admin','manager','cashier'));
