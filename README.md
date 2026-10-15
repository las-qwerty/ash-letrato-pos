# ASH LETRATO POS

Point-of-sale monorepo — one shared core, three frontends.

```
packages/
  core/         @simmy/core        — domain types, cart engine (VAT, SC/PWD rules), demo seed data
  api-client/   @simmy/api-client  — typed REST client for /api/v1 backends
apps/
  web/          @simmy/web         — Next.js POS app (the main app)
  desktop/      @simmy/desktop     — Tauri shell wrapping the web app
  mobile/       @simmy/mobile      — Expo React Native app (register on the go)
```

## Quick start

```bash
npm install
npm run dev          # web app on http://localhost:3100
```

Demo sign-in: `admin@ashletrato.com` / `letrato123` — supervisor PIN `2468` for voids/refunds.

## Dedicated-device mode

The web app is installable as a standalone app (PWA): open the site in
Edge/Chrome → **Install app** from the address-bar menu → pin it to the taskbar
or add it to Windows startup. `start_url` is `/pos`, so one click lands on the
register.

For a shared till, hit the **lock** icon in the sidebar — the app drops to a
PIN screen (survives refresh). Staff tap their avatar → 4-digit PIN → back
selling. The register also auto-locks after idle minutes (Settings → Security).
Demo PINs: Simone `2468`, Maria `1357`, Jonas `1122`.

## What's inside

- **POS register** — product/service grid, area-priced items (W×H × rate), cart with
  handlers, customer attach, Senior/PWD statutory discounts (20% + VAT-exempt),
  manual discounts, **promo codes**, loyalty point redemption,
  cash/GCash/Maya/card tender, receipt.
- **Dashboard** — today’s KPIs, 7-day sales chart, top products, low-stock alerts.
- **Transactions** — full history, receipt reprint, void/refund gated by the
  authorizing supervisor’s own register PIN.
- **Products / Inventory** — catalog CRUD, materials with restock/adjust,
  low-stock bars, and a physical **stock count** flow (count vs expected →
  bulk adjustments).
- **Customers** — tiers, loyalty balances, lifetime spend, SC/PWD eligibility.
- **Promotions** — percent / peso-off / buy-X-get-Y codes with min spend,
  date windows, and usage limits (e.g. `BULK10`, `STUDIO200`, `PHOTO12`).
- **Staff** — roles, branches, per-user register PINs, void/refund authorization.
- **Reports** — revenue, payment mix, hourly sales, void/refund audit.
- **Branches / Settings** — multi-branch view, store identity, receipt, loyalty,
  security (auto-lock minutes + demo reset).

## Desktop (Tauri)

Requires the [Rust toolchain](https://rustup.rs). The shell loads the web app:
in dev it proxies `localhost:3100`; for release, build the web app as a static
export (`output: 'export'`) into `apps/web/out`.

```bash
cd apps/desktop
npm run dev        # tauri dev
npm run build      # produces an .msi/.exe installer
```

Hardware integrations (ESC/POS printer, cash drawer, scanner) slot in as Tauri
commands in `src-tauri/src/main.rs`.

## Mobile (Expo)

```bash
cd apps/mobile
npm run start      # scan the QR code with Expo Go
```

Shares the cart engine and seed data from `@simmy/core` via the Metro monorepo
config in `metro.config.js`.

## Connecting a real backend

The web app currently runs on a local persisted store (`apps/web/src/lib/store.ts`,
seeded from `@simmy/core`). To go live:

1. Set the API base URL in each app's config to your `/api/v1` server.
2. Replace store calls with `@simmy/api-client` — the client already mirrors the
   endpoint surface (`auth`, `sales`, `products`, `inventory`, `dashboard`, …).
3. Plug a platform token store into `createClient({ tokens })`.

## Security notes (demo)

The local build is hardened for demo purposes, not production:

- Register PINs are salted SHA-256 hashed at rest (`apps/web/src/lib/pin.ts`);
  seeded plaintext PINs migrate on first successful verify. On plain-HTTP LAN
  hosts where `crypto.subtle` is unavailable, it falls back to FNV-1a — run
  over `localhost` or HTTPS for real hashing.
- The PIN pad rate-limits: 5 wrong attempts → 30 s lockout.
- Void/refund requires an authorized supervisor's own PIN (never the cashier's).
- All forms validate before writing (ranges, required fields, duplicate codes).

Remaining limitation: credentials and data live in `localStorage`, which any
device user can read/edit. Production must move auth, PINs, and authorization
server-side — the API client is ready for that swap.
