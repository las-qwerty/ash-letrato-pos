# ASH LETRATO POS — System Flow

How the whole system works, end to end — first the user-facing flow, then the data flow underneath for anyone maintaining the code.

---

## Part 1 — The user flow

```
┌──────────┐   ┌──────────────┐   ┌────────────┐   ┌──────────┐   ┌──────────┐
│ Sign in  │──▶│ PIN lock     │──▶│ Register   │──▶│ Payment  │──▶│ Receipt  │
│ (email)  │   │ (who's here) │   │ (sell)     │   │ (tender) │   │ (print)  │
└──────────┘   └──────────────┘   └────────────┘   └──────────┘   └──────────┘
                                        │
                    ┌───────────────────┼─────────────────────────┐
                    ▼                   ▼                         ▼
              Management screens   Transactions            Dashboard / Reports
              (products, services, (reprint / void /        (live graphs,
               inventory, staff…)   refund w/ supervisor)    audit trail)
```

### 1. Sign-in

Two credential paths, one form:

- **Owner:** `admin@ashletrato.com` + `letrato123` → lands as the owner account.
- **Staff:** their own email + 4-digit PIN (e.g. `maria@ashletrato.com` + `1357`) → lands as *them*, so sales tag their name.

### 2. PIN lock (daily use on a shared till)

- The register locks on demand (lock icon) and **auto-locks** after idle minutes (Settings → Security).
- Lock screen shows every staff member → tap face → enter PIN → register opens as that person.
- 5 wrong entries → 30-second cooldown. One entry = one attempt.
- This is how cashiers work all day — no email/password needed after the first sign-in.

### 3. Register (the sale)

1. **Add items** — tap a card, type a name, or scan/enter a SKU/barcode + Enter.
   - Fixed-price items add directly.
   - Area-priced services (tarpaulin, sintra…) ask for **W × H** → computes price from sq ft.
2. **Every line needs a handler** (who does the work) — auto-fills with the signed-in user, can be reassigned per line. A line without a handler **blocks Charge**.
3. **Attach a customer** (optional) — pick a member or quick-add one inline.
4. **Discounts, in order:**
   - SC/PWD members → automatic senior/PWD discount, VAT-exempted correctly.
   - Manual percentage discount (with reason).
   - Promo code (`BULK10`, `STUDIO200`…) — validated before applying.
   - Loyalty points redemption (if the member has points).
5. **Charge** → payment modal: Cash / Card / GCash / Maya. Cash gets quick-tender buttons and change math.
6. **On confirm** the system validates everything again (cart rules + handlers + amount) then saves.

### 4. What a completed sale updates automatically

- Invoice number issued (`INV-…`).
- Product stock deducted (goods only — services have no stock).
- **Materials deducted** via each product's recipe (e.g. a tarp job burns vinyl + ink).
- Customer: spend accrues, points earned/redeemed, **tier auto-upgrades** (silver ₱10k / gold ₱40k / platinum ₱80k).
- Promo usage counter increments.
- Dashboard + Reports recompute — the live graph tweens to the new value.
- Receipt prints (Ctrl+P works on the terminal's built-in printer).

### 5. Corrections (Transactions)

- **Reprint** — any receipt, anytime.
- **Void** — supervisor PIN required → sale cancelled **and everything reverses**: stock + materials restored, points/spend/tier rolled back.
- **Refund** — supervisor PIN required → money returned but consumption stays (the print job was already produced).
- Both write to the audit trail with who authorized it.

### 6. Management flow

- **Products** = physical goods (mugs, shirts, totes) with stock counts.
- **Services** = billed work (tarp, photocopy, IDs, OR pads, BIR ATP) — no stock, but each can carry a **material recipe**.
- **Inventory** — restock, manual adjust (with reason), and full **stock count** mode.
- **Customers** — members, tiers, SC/PWD flags.
- **Staff** — roles (cashier / handler / manager / owner), 4-digit PINs, void-authorization flag.
- **Promotions / Branches / Settings** — codes, locations, store identity, receipt, loyalty, security.
- **Settings → Data** — **Export** a full backup `.json` or **Import** one from another device (validated first, so a bad file can't corrupt anything).
- **Settings → Security** — auto-lock timing + "Reset to seed data" for demos.

---

## Part 2 — The data flow (technical)

### Architecture: local-first monorepo

```
apps/web        Next.js 15 App Router  ──┐
apps/desktop    Tauri 2 wraps web/out  ──┤── all share ──┐
apps/mobile     Expo / React Native   ──┘               │
                                                        ▼
packages/core   @simmy/core — types, seed, pricing, discounts,
                          validation, PIN hashing, inventory ledger,
                          payroll engine, Code128 encoder (pure TS, no DOM)
packages/api-client  prepared HTTP client for the future cloud API
```

- Same domain logic everywhere; UI is a thin shell.
- **State:** Zustand + `persist` → `localStorage` (web/desktop) / `AsyncStorage` (mobile). Key: `simmy-pos` (v3), `simmy-pos-mobile` (v3).
- Desktop ships the web app's **static export** (`output: 'export'`) inside the Tauri binary — no server needed at runtime.

### Enterprise collections (v3 schema)

| Collection | Spine for |
|---|---|
| `stockMovements` | Append-only inventory ledger — every received/consumed/transfer/adjust/waste/count-fix/void-reversal event with branch + actor |
| `punchRecords` | Production job tickets (unique `ticketCode`, qty/damaged/reprocessed, status, supervisor corrections) |
| `counterReadings` | Machine open/close counter readings per shift → variance vs punched vs POS-expected |
| `employeeProfiles` | HR details attached to `User` accounts — position, salary type/rate, allowances, deductions, OT multiplier |
| `attendance` | Clock in/out + leave records (approved leave feeds payroll) |
| `payrollRuns` | Draft → reviewed → approved → paid; `slips` computed by `computePayslip` from attendance |
| `auditLog` | Append-only sensitive-action trail — who authorized what, when, where |

- `Sale.branchId` + `cashierId` + `fees[]` — transactions are branch/cashier attributed; the configurable notary fee posts as a fee row (excluded from VAT).
- `Material.stockByBranch` + `unitsPerPack`/`packUnit` — per-branch stock with unit conversion (500 sheets ≈ 1 ream); `moveStock` keeps `stockQty` = Σ branches.
- `Product.machineTracked` (reconciled in Production), `Product.notaryFee`, `Product.imageUrl`, `Product.description`.
- **Migration v3** backfills `branchId` on legacy sales; pre-v3 backup files import with seed fallbacks for the new collections.
- **RBAC:** sidebar filters routes per role (`cashier` → POS/sales/production/customers; `handler` → POS/production; manager+ see all). Payroll export is owner/manager-only.

### Lifecycle

1. **First launch** → no stored state → seeds the full ASH LETRATO dataset (catalog, 3 branches, staff, customers, materials, promos, demo sales).
2. **Every load after** → `persist` rehydrates; the **v1→v2 migration** normalizes old data (fixes `@simmy.co` emails, backfills `kind` on products) — old installs self-heal, no reset needed.
3. **Every mutation** → Zustand `set()` → persist writes the whole slice → survives restarts.
4. **PINs** are verified via `hashPin()` and upgraded from plaintext to hash on first successful use (`verifyPin`).

### Sale record data path

```
UI (Register) → cart state → validation (validateCart / missingHandlers)
→ PaymentModal re-validates → recordSale(sale, promoId)
   ├─ sales[]            prepend (branchId, cashierId, fees[])
   ├─ products[]         fixed-stock minus qty
   ├─ materials[]        moveStock at sale.branchId (recipe.qty × line.qty)
   ├─ stockMovements[]   'consumed' row per material used
   ├─ customers[]        spend + points + tierForSpend()
   ├─ promotions[]       usageCount + 1
   └─ sale.lines[]       stamped w/ productId, handlerId, handlerName
→ Dashboard/Reports derive from sales[] reactively (+ 15s tick for dates)

Voids write 'void_reversal' movements + audit; refunds keep consumption.
Transfers write paired transfer_out/transfer_in movements sharing one refId.
Stock counts write 'count_correction' movements for each difference.
```

### Authorization points

| Action | Gate |
|---|---|
| Open register | Staff PIN (lock screen) |
| Owner sign-in | email + password |
| Staff sign-in | email + PIN |
| Void / Refund | PIN of a user with `canAuthorizeVoids` |
| Punch correction | Supervisor PIN + reason (audit entry) |
| Payroll approve/pay | Supervisor PIN (audit entry) |
| Payroll export | owner/manager role only |
| Lockout | 5 wrong PINs → 30 s cooldown |

### Data portability

- **Export** → `exportData()` wraps the full state `{ app, version, exportedAt, data }` → `.json` download.
- **Import** → `importData()` validates shape, normalizes legacy fields, replaces state; bad files return an error and change nothing.
- **Reset** → `resetDemo()` restores seed (all local).

### Path to cloud (when clients arrive)

`@simmy/api-client` already exists with the REST surface and Bearer/JWT auth shape. Migration = swap the `persist`-backed store calls for API calls — the UI and `packages/core` don't change.
