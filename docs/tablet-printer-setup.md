# Receipt printing and cash drawer setup

ASH LETRATO POS prints receipts straight to the printer and can open the cash
drawer. The Android tablet no longer needs the RawBT app. The iPad prints to a
Wi-Fi or Ethernet printer.

---

## Before you update the tablet

Version 1.4 fixes App updates ("Failed to download from") and includes the cash drawer fix. The
app already on the tablet cannot repair itself, because its updater runs inside the app, so it
needs this new APK. Every Android build is signed with a new key, so Android will not install it
over the app already on the tablet. Uninstalling deletes the app's data, so back it up first:

1. Open **Settings → Data**. If **Copy backup text** is there, tap it, save the text in a private
   note, and go to step 3.
2. If there is no **Copy backup text** button, the installed app is older than 1.4. Do not uninstall
   yet. Connect the tablet to a PC with USB debugging on, open `chrome://inspect` in Chrome on the
   PC, click **inspect** under ASH LETRATO POS, and paste this into the console:
   `copy(JSON.stringify({app:'ash-letrato-pos',version:3,data:JSON.parse(localStorage.getItem('simmy-pos')).state}))`
   The `version:3` makes the restore add the new services. Save the result in a private note. This
   route is untested on your tablet. The text should start with `{"app":"ash-letrato-pos"` and be
   well over 100 KB. Do not uninstall unless it does.
3. Uninstall **ASH LETRATO POS**.
4. Install the 1.4 APK (step 1 below), open the app, and sign in.
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

The iPad also needs the new `ios-latest` IPA to fix App updates. The updater runs inside the app,
so the copy installed today cannot repair itself. Install it with Sideloadly over the existing app
first, which keeps the app's data. If iOS refuses, the app has to be deleted, which also deletes its
data. The installed iPad app has no backup button, so ask before deleting it.

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
