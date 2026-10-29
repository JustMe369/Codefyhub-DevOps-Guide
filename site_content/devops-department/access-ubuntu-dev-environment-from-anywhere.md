## Purpose and ownership

This workflow explains how an authorized Codefyhub user opens the graphical Ubuntu Desktop development environment from Windows, macOS, iOS, iPadOS, or Android. The Codefyhub DevOps Department owns the workflow and the remote-access service.

> 🔐 **Security First:** Your password is **not** printed here. Ask your administrator for the password. **Never** share it in chats, emails, or screenshots. Never save it in a public note.

The target is the Ubuntu Desktop host at `192.168.1.224` using Remote Desktop Protocol (RDP). The remote username is case-sensitive: `Remote`. The password is intentionally **not stored in this knowledge bank, source code, tickets, or chat**. Retrieve it only from the approved Codefyhub secret manager or directly from an authorized DevOps administrator.

## Access requirements

Before connecting, confirm all of the following:

- You have permission to use the Codefyhub development environment.
- Your device is connected to the Codefyhub office network or approved company VPN. `192.168.1.224` is a private address and is not reachable directly from the public internet.
- The Ubuntu workstation is powered on, awake, and connected to the network.
- You have a current RDP client and the remote password from the approved secret channel.

Never expose or forward TCP port `3389` to the internet. If off-site access is required, connect to the approved VPN first. Do not ask another user to send the password in email, a ticket, or a chat message.

### DevOps one-time host preparation

An authorized DevOps administrator prepares the Ubuntu host (the `Remote` account must already exist). If not already done, the administrator installs **xrdp** on the Ubuntu machine:

```bash
sudo apt update
sudo apt install xrdp -y
sudo systemctl enable xrdp
sudo systemctl status xrdp
```

The administrator then configures Remote Login (RDP) on TCP port `3389`, scopes the firewall rule to the approved network, and stores the RDP password in the approved secret manager. For the office subnet, the administrator can validate and apply:

```bash
sudo ufw status verbose
sudo ufw allow from 192.168.1.0/24 to any port 3389 proto tcp
sudo ss -lnt | grep ':3389'
```

VPN clients may use another approved subnet; DevOps must add that exact subnet. Do not broaden the rule to `Anywhere` merely to make a failed connection work.

## Connection profile

Use this same profile on every client:

| Field | Value |
|---|---|
| Friendly name | `Codefyhub Ubuntu Dev` |
| PC name / host | `192.168.1.224` |
| Port | `3389` |
| Username | `Remote` |
| Password | Retrieve from the approved Codefyhub secret channel |
| Gateway | None while connected directly through the office LAN or approved VPN |

Prefer **ask every time** for the password, especially on mobile or shared devices. Accept a certificate prompt only after confirming that the host is `192.168.1.224` and the connection is on the approved network. If the certificate unexpectedly changes, stop and contact DevOps.

### Optional reachability checks

On Windows, open PowerShell and check the RDP port:

```powershell
Test-NetConnection 192.168.1.224 -Port 3389
```

On macOS, open Terminal and run:

```bash
nc -vz 192.168.1.224 3389
```

A failed ping alone does not prove that RDP is down because ICMP may be filtered. The TCP port check is the useful test.

## Windows workflow

1. Connect Windows to the Codefyhub office network or approved VPN.
2. Press **Windows + R**, enter `mstsc`, and press **Enter** to open Remote Desktop Connection.
3. In **Computer**, enter `192.168.1.224`.
4. Select **Show Options**. Enter `Remote` in **User name**.
5. Under **Display**, choose the preferred resolution or full screen. Under **Local Resources**, share only the clipboard or devices required for the task.
6. Select **Connect** and enter the password from the approved secret channel. Do not save it on a shared computer.
7. Verify the certificate destination before accepting the prompt. The Ubuntu graphical login or desktop should appear in a Remote Desktop window.

## macOS workflow

1. Install or open **Windows App** from the Mac App Store, then connect the Mac to the office network or approved VPN.
2. Open **Devices**, select **+**, and choose **Add PC** or **PC**.
3. Set **PC name** to `192.168.1.224` and **Friendly name** to `Codefyhub Ubuntu Dev`.
4. For the user account, enter `Remote` and choose to ask for the password when connecting.
5. Configure the display to fit the window or use full screen. Enable clipboard, folders, microphone, or camera only when the work requires them.
6. Save the profile, open it, and provide the password from the approved secret channel.
7. Confirm the host on any certificate prompt. The Ubuntu graphical desktop should open in its own window.

## iOS and iPadOS workflow

1. Install or open **Windows App** from the Apple App Store and connect the device to the office Wi-Fi or approved VPN.
2. Select **+**, choose **PC**, and enter `192.168.1.224` as the PC name.
3. Add the user `Remote`. Prefer entering the password for each connection instead of storing it on the device.
4. Save the profile as `Codefyhub Ubuntu Dev`, then tap it to connect.
5. Confirm the expected host if a certificate prompt appears.
6. Use the toolbar to switch between touch-pointer and direct-touch modes. On iPad, a keyboard and pointing device provide the closest experience to a desktop workstation.

## Android workflow

1. Install or open **Windows App** from Google Play and connect the device to the office Wi-Fi or approved VPN.
2. Select **+**, choose **PC**, and set the PC name to `192.168.1.224`.
3. Enter `Remote` as the user. Choose password prompting rather than saved credentials when available.
4. Set the friendly name to `Codefyhub Ubuntu Dev`, save, and tap the connection.
5. Enter the approved secret and verify the host on any certificate prompt.
6. Use pointer mode for precision. Grant file, microphone, or storage permissions only when the assigned task needs them.

## Expected outcome and verification

The expected outcome is a responsive window showing the Codefyhub Ubuntu graphical desktop. Open Terminal in the remote session and verify that the session is on the intended host without exposing credentials:

```bash
whoami
hostname -I
printf 'Remote desktop session is ready\n'
```

The displayed IP list should include `192.168.1.224`. The account identity should match the provisioned remote account `Remote`. Open a permitted development tool and confirm that keyboard input, pointer movement, and window resizing work. This workflow is source-reviewed; report the client platform and result to DevOps if first-use validation has not yet been recorded for that device.

## Troubleshooting

### The client cannot reach the PC

- Confirm the office LAN or approved VPN is connected before testing the private IP.
- Run the platform reachability check for TCP `3389`.
- Ask DevOps to confirm that the Ubuntu host is awake, Remote Login is enabled, and the firewall permits your approved subnet.
- Do not solve the problem by exposing port `3389` to the public internet.

### Authentication fails

- Enter the username exactly as `Remote` and use the RDP password, not a device PIN or biometric code.
- Retrieve the current password from the approved secret channel; do not paste it into a support ticket.
- If several authorized users fail, ask DevOps to verify or rotate the RDP credential in the secret manager.

### A black screen or existing-session warning appears

- Ubuntu Remote Login can require the local desktop user to be logged out. Ask the local user to save work and log out.
- Terminate another session only with its owner's or DevOps' approval. Confirm the client is using Remote Login on port `3389`, not Desktop Sharing on `3390`.

### Display, keyboard, or touch is difficult to use

- Reduce the resolution on a slow link, switch between full screen and fit-to-window, verify the local and Ubuntu keyboard layouts, and use pointer mode on mobile. Reconnect after changing display settings.

When escalating, provide the time, client OS and version, whether LAN or VPN was used, and the exact error text. Never include the password or a screenshot that reveals credentials.

## Security and session closeout

1. Save work and close development tools normally.
2. Use the Ubuntu system menu to **Log Out** when the session is finished; closing the client window may only disconnect it.
3. Remove saved credentials from a shared or borrowed device and disconnect the VPN when it is no longer needed.
4. Report unexpected certificate changes, repeated authentication prompts, unknown sessions, or suspected credential exposure immediately to the Codefyhub DevOps Department.
5. DevOps must rotate the remote password after suspected exposure and update only the approved secret manager—never this workflow.

The approved network path, named user, least-privilege client sharing, secret handling, and explicit logout are all part of the workflow. Skipping them means the access session is not compliant.
