# Supabase backend — setup

The app is local-first; this backend is the central sync target. Phases:

1. **Backend** (this dir): Postgres schema + RLS mirroring the app's role matrix
2. **Client**: `src/supabase.ts` defines the `PosSyncClient` contract
3. **Wire-in**: app gains a sync engine that pushes/pulls deltas — till keeps working offline
4. **Cut-over**: per-module, verified one at a time

## Create the project

1. [supabase.com](https://supabase.com) → New project → name `ash-letrato`, pick a region close to PH (`ap-southeast-1` Singapore), save the DB password
2. Project → **SQL Editor** → run these one at a time, in order:
   1. `migrations/0001_init.sql`
   2. `migrations/0002_seed.sql`
   3. `migrations/0003_harden.sql` — security fixes, required
3. Settings → **API** → copy `Project URL` + `anon public` key — these go in the app's Settings (sync config, Phase 3)

Check the state. Expect `3`, `4`, and `false`:

```sql
select
  (select count(*) from branches) as branches,
  (select count(*) from staff_users) as staff,
  (select payload ? 'supervisorPin' from store_settings where id = 'default') as pin_in_settings;
```

## Create the owner account

Authentication → Users → Add user → `admin@ashletrato.com` + a real password.
Then in SQL Editor, link the auth user to the seeded staff row:

```sql
update staff_users
set auth_uid = (select id from auth.users where email = 'admin@ashletrato.com')
where email = 'admin@ashletrato.com';
```

(Requires the seed staff row to exist — see `migrations/0002_seed.sql`.)

## Security model

- `anon` key goes in the apps. It is safe only because **every table has RLS on**; unauthenticated callers get zero rows
- `service_role` key bypasses RLS — never ship it in any app
- **Never synced:** `User.pin`, `User.pinHash`, `StoreSettings.supervisorPin`. PINs stay on the device that set them
- **Never store secrets in `store_settings`** — every staff login can read it
- **Stock is ledger-driven:** sync `stock_movements` as deltas. `material_stock` is maintained by trigger; never write it directly

## Tests

RLS is tested against a real Postgres engine (PGlite) with role-switched sessions:

```bash
npm test -w @simmy/api-client
```

Add a test for every new policy.
