# ASH LETRATO POS — User Guide

Step-by-step instructions for staff and managers. Everything runs locally on the device — no internet needed for the demo.

---

## 0. Installing the app

**Windows:** run `ASH LETRATO POS Setup.exe` → next → finish. Done.

**Android tablet/phone (APK):**
1. Copy `ASH LETRATO POS.apk` to the device (USB, Drive, email, Bluetooth — any way).
2. On the tablet, open the **Files** app → find the APK → tap it.
3. Android asks to allow installs from that source — tap **Allow** (it’s a one-time setting for the file manager/browser you used).
4. Tap **Install** → **Open**. The app lands on the sign-in screen; the full POS, inventory, production, HR, and reports are all inside.
5. First time you use **camera barcode scan** at the register, Android asks for camera permission → **Allow**.

If Play Protect shows a warning ("unknown app") because the APK isn't from the Play Store, tap **Install anyway** — the APK is signed with the ASH LETRATO certificate.

---

## 1. Signing in

**Web:** open the app (browser shortcut, installed app, or `localhost:3100`).

**Desktop:** double-click **ASH LETRATO POS**.

1. On the sign-in screen enter the manager account:
   - Email: `admin@ashletrato.com`
   - Password: `letrato123`
2. You land on the **Register**.
3. Staff can also sign in here — enter **their own email** and their **4-digit register PIN** (e.g. `maria@ashletrato.com` + `1357`). The register then tags sales under their name. In daily use the faster path is the PIN lock screen (see below).

---

## 2. The PIN lock screen (daily staff use)

This is how cashiers get on the register — no email, no password.

1. Tap your **name/avatar** on the lock screen.
2. Type your **4-digit PIN** on the keypad → the register opens instantly.

| Staff | PIN |
|---|---|
| Simone | `2468` |
| Maria | `1357` |
| Jonas | `1122` |

- Wrong PIN 5 times → 30-second lockout (countdown shows on screen).
- Tap `‹` back to switch to a different staff member.
- The register **auto-locks** after a few idle minutes (configurable in Settings). Anyone can tap the lock icon in the sidebar to lock it manually.

---

## 3. Making a sale (Register)

### Add items

- **Click a product card** to add it, or
- **Type in the search box** to filter by name/SKU, or
- **Scan a barcode** — type/scan the full SKU and press `Enter` to add instantly.

### Area-priced items (tarpaulins, banners)

1. Click a product showing a ruler icon (priced per sq ft).
2. Enter **Width × Height** in feet → the price computes automatically.
3. Confirm — it appears in the cart as e.g. "4×6 ft".

### Adjust the cart

- `+` / `−` steppers change quantity.
- 🗑 removes the line.
- Assign a **handler** (who does the work) per line if needed.
- Per-line discount available on each item.

### Attach a customer

1. Click **Add customer** in the cart.
2. Search the member list, or tap **+ New member** (name + optional phone → attached instantly).
3. **SC/PWD members get their discount automatically** — 20% off + VAT-exempt, applied on attach. No manual step.

### Discounts & promos

- **Senior/PWD:** automatic when the customer is flagged SC/PWD.
- **Manual discount:** the 10% toggle in the cart.
- **Promo code:** type it in the promo field → applies if valid. Try `BULK10` (10% off over ₱500), `STUDIO200` (₱200 off over ₱1,000), `PHOTO12` (buy 10 4R prints, get 2 free).
- **Loyalty points:** if the member has enough points, the redeem option appears in the cart.

### Payment

1. Click **Charge** → payment modal shows the total.
2. Pick the method: **Cash, Card, GCash, or Maya**.
3. For cash: type the tendered amount or tap a quick-tender button (₱500, ₱1,000, exact) → **change computes live**.
4. Confirm → the receipt screen appears.

### Receipt

- Review the itemized receipt.
- **Print** button → prints the 72mm receipt layout only.
- **New sale** → back to a cleared register.

---

## 4. Transactions — reprints, voids, refunds

Go to **Sales** in the sidebar.

- Click any sale to view/reprint its receipt.
- **Void** (same-day mistake) or **Refund** (returned goods):
  1. Choose the action on the sale.
  2. A supervisor must authorize: pick the supervisor's name and enter **their PIN** (e.g., Maria `1357`).
  3. **Void** reverses everything — stock restored, loyalty points and spend removed, materials returned.
  4. **Refund** keeps material consumption (the goods were already produced) but reverses payment totals.
- Every authorization is logged — see it in **Reports → Audit**.

---

## 5. Products & categories

**Products page:**

- **New product** → name, SKU, category, price, pricing type (fixed or per-area), stock.
- **Edit** any row to change details or archive it.
- **Archive** hides it from the register without deleting history.
- **Consumes materials** — link raw materials so each sale deducts stock automatically (e.g., one tarpaulin = 1 sqm vinyl + ink). Add rows, set qty per unit sold.

**Categories button:** add, rename inline, or delete categories (delete is blocked while products still use it — reassign first).

---

## 6. Inventory

**Inventory page** tracks raw materials per branch (vinyl, ink, A4 paper…):

- **Branch selector** — view stock at one branch or consolidated across all.
- **Restock** — add received stock at the selected branch.
- **Adjust** — correct a count; choose "damage"/"waste" as the reason to log it as waste.
- **Transfer** — move stock between branches; writes paired out/in movements and checks the source balance first.
- **Stock count** (stocktake): type counted amounts → differences post automatically as *count corrections*.
- **Movements tab** — the full ledger: every receipt, sale consumption, transfer, waste, count fix, and void reversal with date, branch, qty, reason, and who did it.
- **Export** — downloads a real `.xlsx` workbook (stock per branch + the movement log).
- Low-stock materials are highlighted and flagged on the dashboard. Unit conversions show automatically (e.g., 500 sheets ≈ 1 ream).

---

## 6b. Production (punching & machine output)

**Production page** holds machine-tracked work accountable:

- Services flagged **machine-tracked** (in the service editor) count toward the day's expected output from POS sales.
- **New job ticket** — pick the service, planned qty, optionally link it to today's sale. Each ticket gets a unique code (JT-0001…) with a printable barcode.
- **Complete** a ticket with actual qty, damaged count, and reprocessed count.
- **Flag** a ticket for investigation when counts look off (writes an audit entry).
- **Correct** — supervisor PIN + reason required; the correction is stamped on the ticket and logged.
- **Machine counters** — log the physical open/close counter readings each shift; the reconciliation card compares POS-expected vs punched vs machine delta and shows the variance.
- **Export** — downloads tickets + counter readings as `.xlsx`.

---

## 7. Customers

- Members list with membership tier, contact, lifetime spend, and loyalty points.
- **Add member** here or at checkout.
- Tiers **upgrade automatically** by lifetime spend: Silver ₱10k → Gold ₱40k → Platinum ₱80k.
- Flag a member **SC/PWD** to auto-apply their discount at the register.

---

## 8. Promotions

- Create codes: **percent off**, **peso amount off**, or **buy-X-get-Y**.
- Options: minimum spend, start/end dates, usage limit.
- Codes validate live at the register; usage counts are tracked here.
- Deactivate a promo anytime without deleting it.

---

## 9. Staff

- Add/edit staff: name, role (cashier / handler / manager / owner), branch, and their **register PIN**.
- Toggle **void authorization** — only enabled staff can approve voids/refunds.
- PINs are stored hashed, never in plaintext.

---

## 10. Branches

- Add/edit branches, set address, mark open or closed.
- Staff and sales can be attributed per branch.

---

## 11. Reports & dashboard

- **Dashboard** — today's sales, transaction count, top items, low-stock alerts, live sales chart.
- **Reports** — Today / 7d / 30d / custom date range, plus branch and payment-method filters:
  - Gross sales, net sales, discounts, refunds, transaction count, average ticket — with a % change vs the previous period.
  - Sales-over-period bar chart, payment-method and branch breakdowns, top items.
  - **Export** — the filtered report as a real `.xlsx` workbook (transactions + summary + per-branch sheet).
  - **Audit trail** — every sensitive action: voids, refunds, transfers, waste, ticket flags/corrections, payroll approvals. Searchable and paginated.

---

## 11b. HR & payroll

**HR & Payroll** has three tabs:

- **People** — each staff member's HR profile: position, employment status, salary type (daily/monthly/hourly), rate, allowances, deductions, OT multiplier, hire date.
- **Attendance** — today's roster: **Clock in / Clock out** per person (duplicate punches are blocked), plus **Leave** recording (vacation/sick/paid/unpaid — the approver is the signed-in user). Full history below.
- **Payroll** — **New run** with a date range generates payslips from attendance:
  - daily staff → rate × (days worked + approved paid leave), hourly → rate × hours, monthly → prorated by period length.
  - overtime = hours over 8/day × hourly equivalent × OT multiplier.
  - Status flow: **draft → reviewed → approved → paid** — approve and pay each need a supervisor PIN and are audit-logged.
  - **Export** (owner/manager only) — payslips + run details as `.xlsx`.

---

## 12. Settings

- Store name/details printed on receipts.
- VAT rate, SC/PWD discount rate, and the **notary/document-stamp fee** (added per unit to services flagged "charges notary fee" — e.g. Notary Service).
- Loyalty earning rate.
- **Auto-lock minutes** — how long the register waits before locking (0 = off).
- **Reset to seed data** — restores the pristine demo set. Use before showing clients.

---

## 12b. Barcodes & camera scanning

- **Product/service rows** have a barcode button → print a Code 128 label (product SKU or its `barcode` field). Set the barcode on the item's edit form.
- **Job tickets** print the same way from the Production page — scanning the ticket code looks the job up.
- **POS camera scan** — the barcode button next to the search box opens the camera (works on Android tablets in Chrome; requires HTTPS or the installed app). Point at the barcode → item is added; scanning the same item again increments its quantity. Unsupported browsers fall back to typing the code.
- USB keyboard-wedge scanners also work — scan into the search box and press Enter (most scanners send Enter automatically).

---

## Moving your data to another device

Each install keeps its own data locally — nothing syncs automatically yet (that needs the future cloud API). To copy your exact setup to another device:

1. On this device: **Settings → Data → Export data (.json)** — saves a backup file.
2. Give the other device the installer **plus that file**.
3. On the other device: sign in → **Settings → Data → Import backup…** → pick the file → confirm.

The import validates the file first (wrong/corrupt files show a clear error and change nothing). A fresh install without a backup simply starts with the demo seed data — either way, no errors.

---

## Quick reference

| Task | Where |
|---|---|
| Sell | Register |
| Reprint/void a receipt | Sales |
| Restock / transfer materials | Inventory |
| Physical count | Inventory → Stock count |
| Movement ledger | Inventory → Movements tab |
| Machine jobs / counters | Production |
| Print a barcode | Products/Services row → barcode icon |
| Camera scan at POS | Register → barcode button |
| Clock in/out, leave | HR & Payroll → Attendance |
| Payroll run | HR & Payroll → Payroll |
| Excel export | Reports / Inventory / Production / Payroll |
| Audit trail | Reports → Audit trail |
| New product / recipe | Products |
| Promo codes | Promotions |
| Staff PINs | Staff |
| Notary fee amount | Settings → Store |
| Auto-lock timing | Settings |
| Fresh demo data | Settings → Reset to seed data |

**Logins:** `admin@ashletrato.com` / `letrato123` · PINs: Simone `2468`, Maria `1357` (supervisor), Jonas `1122`.
