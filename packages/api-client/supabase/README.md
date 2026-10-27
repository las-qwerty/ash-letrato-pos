# Supabase backend — setup

The app is local-first; this backend is the central sync target. Phases:

1. **Backend** (this dir): Postgres schema + RLS mirroring the app's role matrix
2. **Client**: `src/supabase.ts` defines the `PosSyncClient` contract
3. **Wire-in**: app gains a sync engine that pushes/pulls deltas — till keeps working offline
4. **Cut-over**: per-module, verified one at a time

## Create the project

1. [supabase.com](https://supabase.com) → New project → name `ash-letrato`, pick a region close to PH (`ap-southeast-1` Singapore), save the DB password
2. Project → **SQL Editor** → paste `migrations/0001_init.sql` → Run
3. Settings → **API** → copy `Project URL` + `anon public` key — these go in the app's Settings (sync config, Phase 3)

## Create the owner account

Authentication → Users → Add user → `admin@ashletrato.com` + a real password.
Then in SQL Editor, link the auth user to the seeded staff row:

```sql
update staff_users
set auth_uid = (select id from auth.users where email = 'admin@ashletrato.com')
where email = 'admin@ashletrato.com';
```

(Requires the seed staff row to exist — see `migrations/0002_seed.sql`.)

## Security notes

- `anon` key goes in the app — safe only because **every table has RLS on**;
  unauthenticated users get zero rows
- `service_role` key bypasses RLS — never ship it in any app
- PINs stay as device-level till unlock; real sessions are Supabase Auth JWTs
