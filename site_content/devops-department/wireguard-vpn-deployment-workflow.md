## Purpose and ownership

This workflow is owned by the Codefyhub DevOps Department. It defines the standard operating procedure for deploying the self-hosted AmneziaWG VPN (via the wg-easy dashboard) to Codefyhub employees across Windows, macOS, iOS, and Android. The process is designed to be simple for the end-user: they only need to install the app and receive their configuration from the administrator.

## Access requirements

Before deploying, confirm you have:
- A Codefyhub company account with admin access to the wg-easy dashboard.
- A server with Docker and Docker Compose available.
- A hostname or DNS entry pointing at the WireGuard server, e.g. `codefyhub.duckdns.org`.
- The AmneziaWG portal reachable at `http://codefyhub.duckdns.org:51821`.

## Connection profile

The WireGuard tunnel uses the following client profile for every user:

```plaintext
[Interface]
PrivateKey = <client private key>
Address = 10.0.0.2/32

[Peer]
PublicKey = <server public key>
Endpoint = codefyhub.duckdns.org:51821
AllowedIPs = 0.0.0.0/0
```

- Server (AmneziaWG portal): `codefyhub.duckdns.org`
- Port: `51821`
- Each client is created individually in the wg-easy dashboard and emits a QR code (mobile) or a `.conf` file (desktop).
- The `.conf` file and QR code contain sensitive cryptographic keys; treat them like passwords.

## Part 1: Admin Workflow (Server Side)

This is the process the system administrator follows for every new user or device.

### Step 1: Generate a New Client in wg-easy
1. Log in to the wg-easy dashboard (e.g., `http://codefyhub.duckdns.org:51821`).
2. On the **Clients** page, click **"+ New"**.
3. Give the client a clear, identifiable name (e.g., `Ahmed-iPhone`, `Sara-MacBook`, `Reception-PC`).
4. Click **Create**.

### Step 2: Obtain the Configuration (Two Options)
You can provide the configuration in one of two ways, depending on the user's device:

* **For Mobile Users (iOS/Android): Use the QR Code**
  * On the client card you just created, click the **QR Code icon** (a small square made of dots).
  * A high-contrast QR code will appear on your screen. This code contains the complete, self-contained configuration.

* **For Desktop Users (Windows/macOS) or as a Fallback: Download the File**
  * On the same client card, click the **Download icon** (an arrow pointing down).
  * This will save a `.conf` file (e.g., `Ahmed-iPhone.conf`) to your computer.

### Step 3: Securely Deliver the Configuration to the User
* **For the QR Code:** Send the QR code image through a secure messaging app (like Signal or WhatsApp) or display it on your screen for the user to scan in person.
* **For the `.conf` File:** Send the file via a secure email or a temporary file-sharing link.
* ⚠️ **WARNING:** Never share these publicly. The QR code and configuration file contain sensitive cryptographic keys that act like passwords.

## Part 2: User Workflow (Device Side)

This is the simple process your users will follow.

### Step 1: Install the AmneziaWG App
Provide your users with the correct link for their device:

| Operating System | Installation Source |
| :--- | :--- |
| **Android** | Google Play Store: Search for `AmneziaWG` |
| **iOS & macOS** | Apple App Store: Search for `AmneziaWG` (id6478942365) |
| **Windows** | Official GitHub Releases: `amnezia-vpn/amneziawg-windows-client` |

### Step 2: Import the Configuration

* **On Mobile (iOS / Android):**
  1. Open the AmneziaWG app.
  2. Tap the **"+"** button.
  3. Select **"Scan QR code"** and point your camera at the code the admin provides.

* **On Desktop (Windows / macOS):**
  1. Open the AmneziaWG app.
  2. Click **"Add Tunnel"** or **"Import Tunnel(s) from File"**.
  3. Select the `.conf` file that was sent to you.

### Step 3: Connect
1. After importing, the tunnel will appear in the app's list.
2. Toggle the switch to **Activate** the connection. The status should change to **Active** with a checkmark.

## Expected outcome and verification

After the deployment, each new client appears in the wg-easy dashboard with an **Active** status, and the user can connect to the VPN and reach internal resources. Verify by:
1. Confirming the client appears in the wg-easy dashboard with **Active** status.
2. Confirming the user can connect on their device and the tunnel icon shows **Active**.
3. Confirming traffic is routed through the WireGuard interface.

## Troubleshooting

### The client cannot connect
- Verify the hostname resolves and the server is reachable.
- Check the AmneziaWG portal logs for tunnel errors.
- Confirm the client is importing the correct configuration file or QR code.

### A client is missing from the dashboard
- Ensure the client was created and the configuration was delivered.
- Revoke and recreate the client if its configuration appears corrupted.

### The tunnel drops repeatedly
- Check for IP conflicts between the WireGuard interface and the LAN.
- Verify the firewall allows the WireGuard UDP port on the server.

## Security and session closeout

- Treat configs like passwords: the QR code and `.conf` file are sensitive and must not be shared or posted online.
- One config per device: create a separate client for each device so a lost or stolen device can be revoked without affecting others.
- Revoke access: if a device is lost or a user leaves, delete the client in the wg-easy dashboard. The associated QR code and `.conf` file become immediately invalid.
- Periodic review: occasionally check the wg-easy dashboard and remove any stale clients.
- Never share configurations publicly or store them in plain text.
