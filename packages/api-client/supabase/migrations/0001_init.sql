-- ═══════════════════════════════════════════════════════════════════════════
-- ASH LETRATO POS — Phase 1 schema
-- Postgres port of packages/core/src/types.ts.
--
-- Conventions:
--   · ids are TEXT — the apps already generate string ids, so sync is a
--     straight copy, no mapping layer
--   · every synced row carries updated_at + version for delta sync
--   · branch_id partitions the business; RLS enforces the role matrix
--     (apps/web/src/lib/roles.ts) at the database level
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ─── Tenancy & staff ─────────────────────────────────────────────────────────

create table branches (
  id          text primary key,
  name        text not null,
  address     text not null default '',
  is_active   boolean not null default true,
  updated_at  timestamptz not null default now(),
  version     integer not null default 1
);

-- App user profile. auth.users owns credentials; this row owns POS identity.
create table staff_users (
  id                  text primary key,            -- app-facing id (u-admin…)
  auth_uid            uuid unique references auth.users(id) on delete set null,
  email               text not null unique,
  first_name          text not null,
  last_name           text not null,
  role                text not null check (role in ('super_admin','manager','cashier','handler')),
  branch_id           text not null references branches(id),
  can_authorize_voids boolean not null default false,
  pin_hash            text,
  is_active           boolean not null default true,
  updated_at          timestamptz not null default now(),
  version             integer not null default 1
);

create table store_settings (
  id            text primary key default 'default',
  payload       jsonb not null,          -- StoreSettings, kept as one document
  updated_at    timestamptz not null default now(),
  version       integer not null default 1
);

-- ─── Catalog ─────────────────────────────────────────────────────────────────

create table categories (
  id          text primary key,
  name        text not null,
  sort_order  integer not null default 0,
  updated_at  timestamptz not null default now(),
  version     integer not null default 1
);

create table products (
  id              text primary key,
  sku             text not null,
  barcode         text,
  name            text not null,
  description     text,
  image_url       text,
  category_id     text references categories(id),
  kind            text not null check (kind in ('product','service')),
  price           numeric(12,2) not null,
  pricing         text not null check (pricing in ('fixed','area')),
  area_unit       text,
  consumes        jsonb not null default '[]',   -- [{materialId, qty}]
  stock_qty       numeric(12,2),
  machine_tracked boolean not null default false,
  notary_fee      boolean not null default false,
  is_active       boolean not null default true,
  updated_at      timestamptz not null default now(),
  version         integer not null default 1
);

create table materials (
  id              text primary key,
  code            text not null,
  name            text not null,
  unit            text not null,
  stock_qty       numeric(12,2) not null default 0,
  stock_by_branch jsonb not null default '{}',   -- {branchId: qty}
  min_stock_level numeric(12,2) not null default 0,
  cost_per_unit   numeric(12,2) not null default 0,
  units_per_pack  numeric(12,2),
  pack_unit       text,
  updated_at      timestamptz not null default now(),
  version         integer not null default 1
);

-- ─── Customers & promotions ──────────────────────────────────────────────────

create table customers (
  id               text primary key,
  code             text not null unique,
  first_name       text not null,
  last_name        text not null,
  phone            text,
  email            text,
  tier             text not null default 'none' check (tier in ('none','silver','gold','platinum')),
  loyalty_points   numeric(12,2) not null default 0,
  lifetime_spend   numeric(14,2) not null default 0,
  is_senior_citizen boolean not null default false,
  is_pwd           boolean not null default false,
  discount_id      text,
  updated_at       timestamptz not null default now(),
  version          integer not null default 1
);

create table promotions (
  id          text primary key,
  code        text not null unique,
  name        text not null,
  type        text not null check (type in ('percent','amount','bxgy')),
  pct         numeric(5,2),
  amount      numeric(12,2),
  buy_qty     integer,
  get_qty     integer,
  product_id  text references products(id),
  min_spend   numeric(12,2),
  starts_at   timestamptz,
  ends_at     timestamptz,
  usage_limit integer,
  usage_count integer not null default 0,
  is_active   boolean not null default true,
  updated_at  timestamptz not null default now(),
  version     integer not null default 1
);

-- ─── Sales ───────────────────────────────────────────────────────────────────

create table sales (
  id              text primary key,
  invoice_number  text not null unique,
  created_at      timestamptz not null default now(),
  cashier_id      text references staff_users(id),
  cashier_name    text not null,
  branch_id       text not null references branches(id),
  branch_name     text not null,
  customer_id     text references customers(id),
  customer_name   text,
  subtotal        numeric(14,2) not null,
  discount_total  numeric(14,2) not null default 0,
  vat_exempt      boolean not null default false,
  tax_total       numeric(14,2) not null default 0,
  total           numeric(14,2) not null,
  payment_method  text not null check (payment_method in ('cash','card','gcash','maya')),
  amount_tendered numeric(14,2) not null default 0,
  change          numeric(14,2) not null default 0,
  points_earned   numeric(12,2) not null default 0,
  fees            jsonb not null default '[]',    -- [{label, amount}]
  status          text not null default 'completed' check (status in ('completed','voided','refunded')),
  void_reason     text,
  authorized_by   text,
  updated_at      timestamptz not null default now(),
  version         integer not null default 1
);

create table sale_lines (
  id            text primary key,
  sale_id       text not null references sales(id) on delete cascade,
  product_id    text references products(id),
  name          text not null,
  qty           numeric(10,2) not null,
  unit_price    numeric(12,2) not null,
  total         numeric(14,2) not null,
  handler_id    text references staff_users(id),
  handler_name  text,
  area          jsonb,                            -- {width,height,unit,rate}
  discount_pct  numeric(5,2)
);
create index sale_lines_sale_idx on sale_lines (sale_id);

-- ─── Inventory ledger (append-only) ──────────────────────────────────────────

create table stock_movements (
  id            text primary key,
  material_id   text not null references materials(id),
  branch_id     text not null references branches(id),
  kind          text not null check (kind in ('opening','received','consumed',
                  'transfer_out','transfer_in','adjustment','waste',
                  'count_correction','void_reversal')),
  qty           numeric(12,2) not null,           -- signed: + in, − out
  reason        text not null default '',
  ref_id        text,
  employee_id   text not null,
  employee_name text not null,
  created_at    timestamptz not null default now()
);

-- ─── Production ──────────────────────────────────────────────────────────────

create table punch_records (
  id              text primary key,
  ticket_code     text not null unique,
  branch_id       text not null references branches(id),
  employee_id     text not null,
  employee_name   text not null,
  service_type    text not null,
  product_id      text references products(id),
  sale_id         text references sales(id),
  qty             numeric(10,2) not null,
  damaged_qty     numeric(10,2) not null default 0,
  reprocessed_qty numeric(10,2) not null default 0,
  status          text not null default 'open' check (status in ('open','completed','flagged')),
  created_at      timestamptz not null default now(),
  completed_at    timestamptz,
  correction      jsonb,                          -- {reason, approvedBy, at}
  updated_at      timestamptz not null default now(),
  version         integer not null default 1
);

create table counter_readings (
  id            text primary key,
  branch_id     text not null references branches(id),
  machine       text not null,
  kind          text not null check (kind in ('open','close')),
  reading       bigint not null,
  employee_id   text not null,
  employee_name text not null,
  shift_date    date not null,
  created_at    timestamptz not null default now()
);

-- ─── HR / payroll ────────────────────────────────────────────────────────────

create table employee_profiles (
  user_id        text primary key references staff_users(id),
  position       text not null default '',
  status         text not null default 'active' check (status in ('active','on_leave','resigned')),
  hired_at       date,
  salary_type    text check (salary_type in ('monthly','daily','hourly')),
  rate           numeric(12,2) not null default 0,
  allowances     numeric(12,2) not null default 0,
  deductions     numeric(12,2) not null default 0,
  overtime_rate  numeric(8,2),
  updated_at     timestamptz not null default now(),
  version        integer not null default 1
);

create table attendance (
  id               text primary key,
  user_id          text not null references staff_users(id),
  branch_id        text not null references branches(id),
  date             date not null,
  clock_in         timestamptz,
  clock_out        timestamptz,
  leave_type       text check (leave_type in ('vacation','sick','paid','unpaid')),
  leave_approved_by text,
  notes            text,
  updated_at       timestamptz not null default now(),
  version          integer not null default 1,
  unique (user_id, date)
);

create table payroll_runs (
  id           text primary key,
  branch_id    text references branches(id),      -- null = all branches
  period_start date not null,
  period_end   date not null,
  status       text not null default 'draft' check (status in ('draft','reviewed','approved','paid')),
  created_by   text not null,
  created_at   timestamptz not null default now(),
  reviewed_by  text,
  approved_by  text,
  paid_at      timestamptz,
  slips        jsonb not null default '[]',       -- Payslip[]
  updated_at   timestamptz not null default now(),
  version      integer not null default 1
);

-- ─── Audit trail (append-only) ───────────────────────────────────────────────

create table audit_log (
  id          text primary key,
  at          timestamptz not null default now(),
  actor_id    text not null,
  actor_name  text not null,
  action      text not null,
  entity      text not null,
  entity_id   text,
  detail      text,
  branch_id   text
);
create index audit_entity_idx on audit_log (entity, entity_id);
create index audit_at_idx on audit_log (at desc);

-- ─── Sync plumbing ───────────────────────────────────────────────────────────

create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  new.version = old.version + 1;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'branches','staff_users','store_settings','categories','products','materials',
    'customers','promotions','sales','punch_records','employee_profiles',
    'attendance','payroll_runs'] loop
    execute format(
      'create trigger %I_touch before update on %I
       for each row execute function touch_updated_at()', t, t);
  end loop;
end $$;

-- Soft-delete flag for sync (physical deletes don't propagate cleanly).
alter table branches        add column deleted boolean not null default false;
alter table products        add column deleted boolean not null default false;
alter table materials       add column deleted boolean not null default false;
alter table customers       add column deleted boolean not null default false;
alter table promotions      add column deleted boolean not null default false;
alter table categories      add column deleted boolean not null default false;

-- ─── Row-level security ─────────────────────────────────────────────────────
-- The role matrix from apps/web/src/lib/roles.ts, enforced in the database.

create or replace function my_staff()
returns staff_users language sql stable security definer set search_path = public as $$
  select * from staff_users where auth_uid = auth.uid() and is_active limit 1;
$$;

create or replace function is_admin() returns boolean language sql stable as $$
  select coalesce((select (my_staff()).role = 'super_admin'), false);
$$;

create or replace function my_branch() returns text language sql stable as $$
  select (my_staff()).branch_id;
$$;

create or replace function my_role() returns text language sql stable as $$
  select coalesce((my_staff()).role, 'anonymous');
$$;

alter table branches        enable row level security;
alter table staff_users     enable row level security;
alter table store_settings  enable row level security;
alter table categories      enable row level security;
alter table products        enable row level security;
alter table materials       enable row level security;
alter table customers       enable row level security;
alter table promotions      enable row level security;
alter table sales           enable row level security;
alter table sale_lines      enable row level security;
alter table stock_movements enable row level security;
alter table punch_records   enable row level security;
alter table counter_readings enable row level security;
alter table employee_profiles enable row level security;
alter table attendance      enable row level security;
alter table payroll_runs    enable row level security;
alter table audit_log       enable row level security;

-- Catalog/config: staff read their scope; admins manage.
create policy branches_read   on branches for select using (my_role() <> 'anonymous');
create policy branches_admin  on branches for all using (is_admin());

create policy staff_read      on staff_users for select using (my_role() <> 'anonymous');
create policy staff_admin     on staff_users for all using (is_admin());

create policy settings_read   on store_settings for select using (my_role() <> 'anonymous');
create policy settings_admin  on store_settings for all using (is_admin());

create policy categories_read on categories for select using (my_role() <> 'anonymous');
create policy categories_mgr  on categories for all using (my_role() in ('super_admin','manager'));

create policy products_read   on products for select using (my_role() <> 'anonymous');
create policy products_mgr    on products for all using (my_role() in ('super_admin','manager'));

create policy materials_read  on materials for select using (my_role() in ('super_admin','manager'));
create policy materials_mgr   on materials for all using (my_role() in ('super_admin','manager'));

-- Customers: cashiers + managers + admin (handler excluded).
create policy customers_read  on customers for select using (my_role() in ('super_admin','manager','cashier'));
create policy customers_write on customers for all using (my_role() in ('super_admin','manager','cashier'));

create policy promos_read     on promotions for select using (my_role() <> 'anonymous');
create policy promos_mgr      on promotions for all using (my_role() in ('super_admin','manager'));

-- Sales: admin sees all; others only their branch. Insert allowed for
-- cashier/manager/admin at their own branch. Voids/refunds = status update.
create policy sales_read on sales for select
  using (is_admin() or branch_id = my_branch());
create policy sales_insert on sales for insert
  with check (my_role() in ('super_admin','manager','cashier')
              and (is_admin() or branch_id = my_branch()));
create policy sales_update on sales for update
  using (is_admin() or (my_role() = 'manager' and branch_id = my_branch()));

create policy sale_lines_read on sale_lines for select
  using (is_admin() or exists (
    select 1 from sales s where s.id = sale_id and s.branch_id = my_branch()));
create policy sale_lines_insert on sale_lines for insert
  with check (exists (
    select 1 from sales s where s.id = sale_id
      and (is_admin() or s.branch_id = my_branch())));

-- Inventory ledger: append-only; manager+ at own branch, admin anywhere.
create policy movements_read on stock_movements for select
  using (is_admin() or (my_role() = 'manager' and branch_id = my_branch()));
create policy movements_insert on stock_movements for insert
  with check (is_admin() or (my_role() in ('manager','handler') and branch_id = my_branch()));

-- Production: handler + manager at own branch; admin everywhere.
create policy punch_read on punch_records for select
  using (is_admin() or branch_id = my_branch());
create policy punch_write on punch_records for all
  using (is_admin() or (my_role() in ('manager','handler') and branch_id = my_branch()))
  with check (is_admin() or (my_role() in ('manager','handler') and branch_id = my_branch()));

create policy counters_read on counter_readings for select
  using (is_admin() or branch_id = my_branch());
create policy counters_insert on counter_readings for insert
  with check (is_admin() or (my_role() in ('manager','handler') and branch_id = my_branch()));

-- HR & payroll: admin only (matches route matrix).
create policy hr_admin on employee_profiles for all using (is_admin());
create policy attendance_admin on attendance for all using (is_admin());
create policy attendance_self_read on attendance for select using (
  user_id = (select (my_staff()).id));
create policy payroll_admin on payroll_runs for all using (is_admin());

-- Audit: insert by any staff, read by admin/manager (manager: own branch).
create policy audit_insert on audit_log for insert with check (my_role() <> 'anonymous');
create policy audit_read on audit_log for select
  using (is_admin() or (my_role() = 'manager' and (branch_id is null or branch_id = my_branch())));
