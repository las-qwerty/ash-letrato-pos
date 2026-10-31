package com.ashletrato.pos;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.os.Build;
import android.util.Base64;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(
    name = "ThermalPrinter",
    permissions = { @Permission(strings = { Manifest.permission.BLUETOOTH_CONNECT }, alias = "bluetooth") }
)
public class ThermalPrinterPlugin extends Plugin {
    private static final UUID SPP = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");
    private static final ExecutorService IO = Executors.newSingleThreadExecutor();
    private static final byte[] STATUS_REQUEST = { 0x10, 0x04, 0x01 };
    private static final int ACK_TIMEOUT_MS = 6000;
    private static final int SETTLE_MS = 2000;

    private boolean needsBluetoothPermission() {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && getPermissionState("bluetooth") != PermissionState.GRANTED;
    }

    @PluginMethod
    public void ping(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("ok", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void listPaired(PluginCall call) {
        if (needsBluetoothPermission()) {
            requestPermissionForAlias("bluetooth", call, "bluetoothPermsCallback");
            return;
        }
        BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
        if (adapter == null || !adapter.isEnabled()) {
            call.reject("Turn on Bluetooth to find your printer.");
            return;
        }
        JSArray devices = new JSArray();
        for (BluetoothDevice d : adapter.getBondedDevices()) {
            JSObject o = new JSObject();
            o.put("name", d.getName() == null ? "Bluetooth device" : d.getName());
            o.put("address", d.getAddress());
            devices.put(o);
        }
        JSObject ret = new JSObject();
        ret.put("devices", devices);
        call.resolve(ret);
    }

    @PluginMethod
    public void printData(PluginCall call) {
        String data = call.getString("data");
        String address = call.getString("address");
        String host = call.getString("host");
        int port = call.getInt("port", 9100);
        if (data == null || data.isEmpty()) {
            call.reject("Nothing to print.");
            return;
        }
        boolean network = host != null && !host.isEmpty();
        if (!network && needsBluetoothPermission()) {
            requestPermissionForAlias("bluetooth", call, "bluetoothPermsCallback");
            return;
        }
        byte[] bytes = Base64.decode(data, Base64.DEFAULT);
        IO.execute(() -> {
            try {
                if (network) {
                    sendNetwork(host, port, bytes);
                } else {
                    sendBluetooth(address, bytes);
                }
                call.resolve();
            } catch (Exception e) {
                call.reject(e.getMessage() == null ? "Printing failed." : e.getMessage());
            }
        });
    }

    @PermissionCallback
    private void bluetoothPermsCallback(PluginCall call) {
        if (getPermissionState("bluetooth") != PermissionState.GRANTED) {
            call.reject("Allow the Nearby devices permission for ASH LETRATO POS, then try again.");
        } else if ("listPaired".equals(call.getMethodName())) {
            listPaired(call);
        } else {
            printData(call);
        }
    }

    private void sendNetwork(String host, int port, byte[] bytes) throws IOException {
        Socket socket = new Socket();
        try {
            socket.connect(new InetSocketAddress(host, port), 8000);
        } catch (IOException e) {
            socket.close();
            throw new IOException("Could not reach the printer at " + host + ":" + port + ". Check it is switched on and on the same Wi-Fi.");
        }
        try {
            InputStream in = socket.getInputStream();
            OutputStream out = socket.getOutputStream();
            drain(in);
            out.write(bytes);
            out.write(STATUS_REQUEST);
            out.flush();
            awaitAck(in);
        } finally {
            socket.close();
        }
    }

    private void sendBluetooth(String address, byte[] bytes) throws IOException {
        BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
        if (adapter == null || !adapter.isEnabled()) throw new IOException("Turn on Bluetooth to print.");
        if (address == null || address.isEmpty()) throw new IOException("Choose a printer in Settings > Printer first.");
        BluetoothDevice device = adapter.getRemoteDevice(address);
        BluetoothSocket socket = connectSpp(device);
        try {
            InputStream in = socket.getInputStream();
            OutputStream out = socket.getOutputStream();
            drain(in);
            out.write(bytes);
            out.write(STATUS_REQUEST);
            out.flush();
            awaitAck(in);
        } finally {
            socket.close();
        }
    }

    private static void drain(InputStream in) throws IOException {
        while (in.available() > 0) in.read();
    }

    /**
     * Waits for the printer's reply to the trailing DLE EOT request. The printer
     * answers once it has received every byte before it, including the drawer
     * pulse, so closing earlier can drop them. Printers that never reply get a
     * fixed settle time instead of an error.
     */
    private static void awaitAck(InputStream in) throws IOException {
        long deadline = System.currentTimeMillis() + ACK_TIMEOUT_MS;
        while (System.currentTimeMillis() < deadline) {
            if (in.available() > 0) {
                in.read();
                return;
            }
            pause(50);
        }
        pause(SETTLE_MS);
    }

    private static void pause(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private BluetoothSocket connectSpp(BluetoothDevice device) throws IOException {
        try {
            BluetoothSocket socket = device.createRfcommSocketToServiceRecord(SPP);
            socket.connect();
            return socket;
        } catch (IOException secureFailed) {
            BluetoothSocket socket = device.createInsecureRfcommSocketToServiceRecord(SPP);
            try {
                socket.connect();
                return socket;
            } catch (IOException e) {
                throw new IOException("Could not connect to the Bluetooth printer. Make sure it is paired and switched on.");
            }
        }
    }
}
