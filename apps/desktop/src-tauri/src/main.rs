// Simmy POS desktop shell — wraps the web frontend in a native window.
// POS hardware integrations (thermal printer, cash drawer, barcode scanner)
// are added here as Tauri commands when wiring real devices.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // WebView2 forwards Chromium flags set via this env var. --kiosk-printing
    // makes window.print() go straight to the default printer with no dialog —
    // must be set before the WebView2 environment is created.
    std::env::set_var(
        "WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS",
        "--kiosk-printing",
    );
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![])
        .run(tauri::generate_context!())
        .expect("error while running Simmy POS");
}
