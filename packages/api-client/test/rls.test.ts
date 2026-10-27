import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { UID, as, createDb, migration, seedFixtures } from './db';

const denied = /row-level security/;
let db: PGlite;
const run = (uid: string | null, sql: string, params?: unknown[]) => as(db, uid, sql, params);

beforeAll(async () => {
  db = await createDb();
  await db.exec(migration('0001_init.sql'));
  await db.exec(migration('0002_seed.sql'));
  await seedFixtures(db);
  await db.exec(migration('0003_harden.sql'));
});

afterAll(() => db.close());

describe('secrets stay off the API', () => {
  it('PIN hashes are not readable by staff', async () => {
    await expect(run(UID.jonas, 'select pin_hash from staff_users')).rejects.toThrow(/pin_hash/);
  });

  it('the supervisor PIN is not in synced settings', async () => {
    const [row] = await run(UID.jonas, "select payload ? 'supervisorPin' as has from store_settings");
    expect(row?.has).toBe(false);
  });
});

describe('branch isolation', () => {
  it("the roster is limited to the caller's branch; the owner sees everyone", async () => {
    const cashier = await run(UID.jonas, 'select id from staff_users order by id');
    expect(cashier.map((r) => r.id)).toEqual(['u-cal-mgr', 'u-jonas']);
    expect(await run(UID.simone, 'select id from staff_users')).toHaveLength(5);
  });

  it("cashiers cannot read another branch's sales", async () => {
    expect(await run(UID.jonas, 'select id from sales')).toEqual([]);
    const owner = await run(UID.simone, 'select id from sales');
    expect(owner.map((r) => r.id)).toContain('s-gh-1');
  });

  it('anonymous callers see no staff, sales, or settings', async () => {
    expect(await run(null, 'select id from staff_users')).toEqual([]);
    expect(await run(null, 'select id from sales')).toEqual([]);
    expect(await run(null, 'select id from store_settings')).toEqual([]);
  });
});

describe('stock comes from the movement ledger', () => {
  it('opening balances carry over per branch', async () => {
    const rows = await run(
      UID.simone,
      "select branch_id, qty from material_stock where material_id = 'm-vinyl' order by branch_id",
    );
    expect(rows.map((r) => [r.branch_id, Number(r.qty)])).toEqual([
      ['br-caloocan', 40],
      ['br-greenhills', 100],
    ]);
  });

  it("a branch manager sees only their own branch's levels", async () => {
    const rows = await run(UID.calMgr, "select branch_id from material_stock where material_id = 'm-vinyl'");
    expect(rows.map((r) => r.branch_id)).toEqual(['br-caloocan']);
  });

  it('deductions from two tills merge instead of overwriting', async () => {
    await run(
      UID.jonas,
      "insert into stock_movements (id, material_id, branch_id, kind, qty, employee_id, employee_name) values ('mv-1', 'm-vinyl', 'br-caloocan', 'consumed', -2, 'u-jonas', 'Jonas Cruz')",
    );
    await run(
      UID.calMgr,
      "insert into stock_movements (id, material_id, branch_id, kind, qty, employee_id, employee_name) values ('mv-2', 'm-vinyl', 'br-caloocan', 'consumed', -1, 'u-cal-mgr', 'Cal Manager')",
    );
    const [row] = await run(
      UID.simone,
      "select qty from material_stock where material_id = 'm-vinyl' and branch_id = 'br-caloocan'",
    );
    expect(Number(row?.qty)).toBe(37);
  });

  it('balances cannot be edited directly', async () => {
    await run(UID.simone, "update material_stock set qty = 999 where material_id = 'm-vinyl'");
    const [row] = await run(
      UID.simone,
      "select qty from material_stock where material_id = 'm-vinyl' and branch_id = 'br-caloocan'",
    );
    expect(Number(row?.qty)).toBe(37);
  });

  it("cashiers cannot record manual adjustments or touch another branch's stock", async () => {
    await expect(
      run(
        UID.jonas,
        "insert into stock_movements (id, material_id, branch_id, kind, qty, employee_id, employee_name) values ('mv-3', 'm-vinyl', 'br-caloocan', 'adjustment', 50, 'u-jonas', 'Jonas Cruz')",
      ),
    ).rejects.toThrow(denied);
    await expect(
      run(
        UID.jonas,
        "insert into stock_movements (id, material_id, branch_id, kind, qty, employee_id, employee_name) values ('mv-4', 'm-vinyl', 'br-greenhills', 'consumed', -1, 'u-jonas', 'Jonas Cruz')",
      ),
    ).rejects.toThrow(denied);
  });
});

describe('every POS role can ring up at its own branch', () => {
  it('a handler records a sale at their branch', async () => {
    await run(
      UID.pia,
      "insert into sales (id, invoice_number, cashier_name, branch_id, branch_name, subtotal, total, payment_method) values ('s-gal-1', 'INV-000002', 'Pia Lim', 'br-galleria', 'Robinsons Galleria', 50, 50, 'cash')",
    );
    expect(await run(UID.simone, "select id from sales where id = 's-gal-1'")).toHaveLength(1);
  });

  it('a handler cannot record a sale at another branch', async () => {
    await expect(
      run(
        UID.pia,
        "insert into sales (id, invoice_number, cashier_name, branch_id, branch_name, subtotal, total, payment_method) values ('s-gh-2', 'INV-000003', 'Pia Lim', 'br-greenhills', 'Main — Greenhills', 50, 50, 'cash')",
      ),
    ).rejects.toThrow(denied);
  });

  it('customers are shared across the register', async () => {
    await run(
      UID.simone,
      "insert into customers (id, code, first_name, last_name) values ('c-1', 'CUS-001', 'Ana', 'Dela Cruz')",
    );
    expect(await run(UID.pia, 'select id from customers')).toHaveLength(1);
  });
});
