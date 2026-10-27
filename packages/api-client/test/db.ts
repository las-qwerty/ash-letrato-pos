import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { readFileSync } from 'node:fs';

// The parts of a hosted Supabase project the migrations rely on: auth.uid(),
// the anon/authenticated roles, and Supabase's default table grants. Row-level
// security is the only gate, as it is in production.
const SUPABASE_SHIM = `
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  create role anon nologin;
  create role authenticated nologin;
  grant usage on schema auth, public to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on sequences to anon, authenticated;
  alter default privileges in schema public grant execute on functions to anon, authenticated;
`;

export const UID = {
  simone: '00000000-0000-4000-8000-000000000001', // u-admin · super_admin · Greenhills
  jonas: '00000000-0000-4000-8000-000000000003', // u-jonas · cashier · Caloocan
  pia: '00000000-0000-4000-8000-000000000004', // u-pia · handler · Galleria
  calMgr: '00000000-0000-4000-8000-000000000005', // u-cal-mgr · manager · Caloocan (fixture)
};

export const migration = (name: string) =>
  readFileSync(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8');

export async function createDb() {
  const db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(SUPABASE_SHIM);
  return db;
}

export async function as(db: PGlite, uid: string | null, sql: string, params: unknown[] = []) {
  await db.exec('reset role');
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid ?? '']);
  await db.exec(uid ? 'set role authenticated' : 'set role anon');
  try {
    return (await db.query<Record<string, unknown>>(sql, params)).rows;
  } finally {
    await db.exec('reset role');
  }
}

export async function seedFixtures(db: PGlite) {
  await db.exec(`
    insert into auth.users (id) values
      ('${UID.simone}'), ('${UID.jonas}'), ('${UID.pia}'), ('${UID.calMgr}');
    update staff_users set auth_uid = '${UID.simone}' where id = 'u-admin';
    update staff_users set auth_uid = '${UID.jonas}' where id = 'u-jonas';
    update staff_users set auth_uid = '${UID.pia}' where id = 'u-pia';
    insert into staff_users (id, email, first_name, last_name, role, branch_id, auth_uid)
      values ('u-cal-mgr', 'cal.manager@test.local', 'Cal', 'Manager', 'manager', 'br-caloocan', '${UID.calMgr}');
    update staff_users set pin_hash = 'fixture-hash' where id = 'u-admin';
    insert into materials (id, code, name, unit, stock_qty, stock_by_branch, min_stock_level, cost_per_unit)
      values ('m-vinyl', 'VIN-1', 'Vinyl roll', 'roll', 140, '{"br-greenhills": 100, "br-caloocan": 40}', 5, 250);
    insert into sales (id, invoice_number, cashier_name, branch_id, branch_name, subtotal, total, payment_method)
      values ('s-gh-1', 'INV-000001', 'Simone Reyes', 'br-greenhills', 'Main — Greenhills', 100, 100, 'cash');
  `);
}
