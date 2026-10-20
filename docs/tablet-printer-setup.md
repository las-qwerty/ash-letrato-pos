# Galaxy Tab S6 Lite + BT-80UB Thermal Printer Setup

Runs ASH LETRATO POS on a Samsung Galaxy Tab S6 Lite and prints receipts to the
BT-80UB thermal printer (80 mm, ESC/POS, USB / Bluetooth / Ethernet) — silently,
straight from the app, no print dialog.

---

## Part 1 — Install the POS app on the tablet

1. On the tablet, open Chrome and go to `ash-letrato-pos.vercel.app` →
   **Download APK**, or directly:
   `https://github.com/las-qwerty/ash-letrato-pos/releases/download/android-latest/ASH-LETRATO-POS.apk`
2. Tap the downloaded `ASH-LETRATO-POS.apk` and allow **Install unknown apps →
   Chrome** when prompted.
3. Open **ASH LETRATO POS** and sign in (`admin@ashletrato.com` / `letrato123`
   for demo).
4. The app self-updates over the air — no reinstall needed for future updates.

---

## Part 2 — Connect the BT-80UB printer

1. Plug in the printer's **DC 24 V** power adapter and switch it on.
2. Load an **80 mm** thermal paper roll (print side facing the head — the coated
   side darkens when scratched with a fingernail).
3. On the tablet: **Settings → Connections → Bluetooth → ON**.
4. In the Bluetooth scan list, tap the printer (usually named `BT-80UB`,
   `Printer-XXXX`, or `BlueTooth Printer`). PIN if asked: `0000` or `1234`.
5. Optional self-test: hold **FEED** while powering on — the printer prints its
   config, including its Bluetooth name.

> Alternative: **Ethernet** — plug the printer into the shop router, note its IP
> (printed on the self-test), and select it by IP inside RawBT instead of
> Bluetooth.

---

## Part 3 — Install and configure RawBT (the print bridge)

The app sends receipts to **RawBT**, a free Android app that talks ESC/POS to
the paired printer.

1. Play Store → install **RawBT** (package `ru.a402d.rawbtprinter`).
2. Open RawBT → grant **Bluetooth / nearby devices** permissions.
3. **Printer → Select printer → Bluetooth → choose BT-80UB** (or enter its IP
   for Ethernet).
4. Set **paper width = 80 mm** — must match Settings → Receipt → 80 mm in the POS.
5. For hands-free printing, in RawBT settings enable:
   - **Print automatically** / don't show preview when receiving jobs
   - **Return to the calling app** after printing (auto-close)
6. Tap **Print test page** — a successful test confirms the link works.

---

## Part 4 — Print a receipt

That's it — no steps needed per sale:

1. Ring up a sale in the POS and complete payment.
2. The app automatically sends the receipt to RawBT → the BT-80UB prints
   immediately. Product names print bold, totals print double-size, the roll
   feeds and cuts.
3. Manual reprints work too: **Transactions → pick a sale → Print**, or the
   **Print receipt** button right after a sale.

Notes:

- **Paper size**: keep **Settings → Receipt → 80 mm** matching the printer and
  the RawBT paper-width setting.
- **RawBT not installed?** The print button quietly does nothing — install it
  (Part 3) and reprint.
- **Faint print?** Raise **density/darkness** in RawBT and lower print speed;
  clean the thermal head with isopropyl alcohol if it's still faint.
- **Barcode labels** still print through the browser print path — use the web
  version in Chrome for those, or ask for ESC/POS label printing to be added.
