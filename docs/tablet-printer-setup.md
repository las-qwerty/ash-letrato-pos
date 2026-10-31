# Receipt printing and cash drawer setup

ASH LETRATO POS prints receipts straight to the printer and can open the cash
drawer. The Android tablet no longer needs the RawBT app. The iPad prints to a
Wi-Fi or Ethernet printer.

---

## Before you update the tablet

Version 1.3 fixes the cash drawer and needs a new APK. Every Android build is signed with a
new key, so Android will not install it over the app already on the tablet. Uninstalling
deletes the app's data, so back it up first:

1. In the current app, go to **Settings → Data → App updates** and tap **Check for updates
   now**. Wait for the app to reload. This adds the copy-backup button. **If that button does not
   appear on Settings → Data, stop here and do not uninstall.** Without it there is no
   way to back up the data on the tablet.
2. Go to **Settings → Data** and tap **Copy backup text**. Save the text in a private note.
   It contains all of the shop's data, so do not share it. (The file export is desktop-only,
   because the tablet cannot save downloaded files.)
3. Uninstall **ASH LETRATO POS**.
4. Install the new APK (step 1 below), open the app, and sign in.
5. Go to **Settings → Data → Restore from pasted text**, paste the text, and tap
   **Restore from pasted text**. Printer choices are kept on the device, not in the backup,
   so choose the printer again in **Settings → Printer**.

---

## Android tablet with the BT-80UB

1. **Install the new APK.** After the backup steps above, open
   `ash-letrato-pos.vercel.app` in Chrome and tap **Download APK**, or use the
   `android-latest` release. Web updates after that arrive automatically.
2. **Pair the printer.** Tablet **Settings → Connections → Bluetooth**, then tap the
   BT-80UB. Enter `0000` or `1234` if asked.
3. **Choose it in the POS.** **Settings → Printer → Find paired printers**, then tap
   the BT-80UB.
4. **Match the paper.** **Settings → Receipt → 80 mm**.
5. **Test it.** **Settings → Printer → Test print**. A test slip prints and the roll cuts.

The first print asks for the **Nearby devices** permission. Tap **Allow**.

The printer must support Bluetooth Classic (SPP). A printer that only supports
Bluetooth LE will not connect.

---

## Cash drawer

- Plug the drawer cable into the drawer port on the back of the printer, not the
  USB or power port.
- **Settings → Printer → Cash drawer** sets when it opens:
  - **Open for cash sales** (default): opens with the receipt of each cash sale.
  - **Open for every sale**: also opens for card and GCash sales.
  - **Never open**.
- Only the automatic receipt after a sale opens the drawer. **Print receipt** buttons and
  reprints from Transactions never do.
- **Open drawer** tests the drawer without printing anything.

---

## iPad

iOS does not let third-party apps open Bluetooth Classic (SPP) printer connections unless
the printer is Apple-certified (MFi). The BT-80UB's Bluetooth type has not been confirmed,
and its listing shows USB and Bluetooth only. Use a thermal printer with **Wi-Fi or
Ethernet**, ESC/POS support, and a drawer port.

1. Connect the printer to the same Wi-Fi as the iPad, or plug it into the router.
2. Print the printer's network self-test (see its manual) to read its IP address.
3. In the POS, go to **Settings → Printer → Network printer**, enter the IP address,
   and leave the port at `9100`.
4. When iOS asks, allow **Local Network** access for ASH LETRATO POS.
5. Press **Test print**.

Until a network printer is set, receipts use the normal print sheet.

The iPad app is installed from the `ios-latest` build with Sideloadly. A free Apple ID
expires about every 7 days, so re-sign the app when it stops opening.

---

## When something goes wrong

- **Choose a printer in Settings → Printer**: no printer is selected yet.
- **Could not reach the printer**: check that it is switched on, on the same Wi-Fi,
  and that the IP address is correct.
- **Could not connect to the Bluetooth printer**: pair it again in Android Settings,
  and disconnect it from any other device.
- **The drawer does not open**: check that the cable is in the drawer port and that the
  drawer setting is not **Never open**.
- **Still no drawer**: press **Open drawer** in Settings → Printer. If that opens the drawer
  but receipts do not, check **Last receipt** in the same tab. It shows whether the drawer
  signal was sent and which path printed it.
- **Faint print**: raise the density in the printer's own settings, or clean the thermal
  head with isopropyl alcohol.

---

## Windows desktop

Receipts go to the Windows default printer as before. Cash drawer control is not
connected on the desktop yet.
