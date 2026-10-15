// Simmy POS desktop shell — wraps the web frontend in a native window.
// POS hardware integrations (thermal printer, cash drawer, barcode scanner)
// are added here as Tauri commands when wiring real devices.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![])
        .run(tauri::generate_context!())
        .expect("error while running Simmy POS");
}
