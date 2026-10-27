## Objective and scenario

Build a two-device Linux software RAID 1 mirror for a service that must remain readable after one member fails. The procedure makes array identity, mounting, monitoring, verification, and recovery explicit. It does **not** make the data safe from deletion, corruption, ransomware, theft, or loss of the host.

Use this guide for a new disposable lab array or during an approved storage change. Do not use it to convert an existing filesystem in place.

> **Destructive operation:** `mdadm --create`, filesystem creation, and partitioning overwrite device metadata. Work only with devices that have been positively identified and whose data may be erased. Maintain a restore-tested backup outside both member devices.

## Applicability and limitations

This source-reviewed procedure targets Ubuntu Server 24.04 LTS, Linux MD RAID, and mdadm 4.x. Package versions and initramfs behavior can differ on other distributions. RAID 1 improves availability for one member failure; it does not replace backups and it does not guarantee uninterrupted service during controller, enclosure, kernel, filesystem, or operator failures.

The example variables are:

| Variable | Safe example | Meaning |
|---|---|---|
| `<array>` | `/dev/md0` | New MD array device |
| `<disk-a>` | `/dev/disk/by-id/ata-LAB_DISK_A` | First unused whole disk |
| `<disk-b>` | `/dev/disk/by-id/ata-LAB_DISK_B` | Second unused whole disk |
| `<mountpoint>` | `/srv/data` | Filesystem mount path |
| `<alert-address>` | `storage-alerts@example.invalid` | Monitored notification address |

Use `/dev/disk/by-id/` paths in recorded procedures. Kernel names such as `/dev/sdb` can change after reboot.

## Prerequisites and recovery access

Before changing storage:

1. Confirm independent console or out-of-band access.
2. Record the affected service owner and maintenance window.
3. Restore a representative file from the current backup into an isolated location.
4. Confirm the two candidate devices are unused and not mounted.
5. Record model, serial number, capacity, transport path, and physical slot.
6. Confirm the replacement and restore procedures are available to another operator.

Run diagnostics from the Ubuntu host with sudo privileges:

```bash
lsblk -e7 -o NAME,PATH,SIZE,MODEL,SERIAL,TYPE,FSTYPE,MOUNTPOINTS
findmnt --real
sudo blkid
sudo mdadm --examine --scan
```

Expected outcome: each candidate appears as an unmounted `disk`, has the expected model and serial number, and is absent from active filesystems and arrays. Stop if any identifier is ambiguous.

## Architecture and traffic flow

Linux MD presents one block device above two physical members:

```text
application -> filesystem -> /dev/md0 -> member A
                                     \-> member B
```

Both members receive writes. Reads may be served from either. A filesystem and its application-consistency requirements remain separate concerns above the array. Monitoring must cover the MD state, underlying device health, kernel errors, filesystem capacity, and backup recoverability.

## Install and create the mirror

Install the administration and SMART tools:

```bash
sudo apt-get update
sudo apt-get install --yes mdadm smartmontools
mdadm --version
```

Inspect both stable paths immediately before creation:

```bash
sudo udevadm info --query=property --name=<disk-a> | grep -E 'ID_MODEL=|ID_SERIAL='
sudo udevadm info --query=property --name=<disk-b> | grep -E 'ID_MODEL=|ID_SERIAL='
sudo wipefs --no-act <disk-a>
sudo wipefs --no-act <disk-b>
```

`wipefs --no-act` is diagnostic; it does not erase signatures. If either disk contains unexpected signatures, stop and resolve ownership instead of adding `--force`.

Create the mirror only after the change record contains the confirmed identifiers:

```bash
sudo mdadm --create <array> --metadata=1.2 --level=1 --raid-devices=2 <disk-a> <disk-b>
```

Observe synchronization without hiding the original command result:

```bash
cat /proc/mdstat
sudo mdadm --detail <array>
```

Representative—not universal—output while building resembles:

```text
md0 : active raid1 sdb[1] sda[0]
      976630336 blocks super 1.2 [2/2] [UU]
      [===>.................]  resync = 18.4%
```

`[UU]` means both expected members are present. Do not interpret a running resync as proof that the filesystem or backup is valid.

## Persist array assembly

Back up the current configuration and append only the discovered array definition:

```bash
sudo install -m 0600 /etc/mdadm/mdadm.conf /etc/mdadm/mdadm.conf.before-codefyhub
sudo mdadm --detail --scan
sudo mdadm --detail --scan | sudo tee -a /etc/mdadm/mdadm.conf
sudo update-initramfs -u
```

Review `/etc/mdadm/mdadm.conf` and remove duplicate `ARRAY` records before rebooting. The downloadable monitoring recipe for this guide provides a reviewed starting point; it is not a substitute for the array-specific line produced on the target host.

## Create and mount the filesystem

This example uses ext4. Filesystem choice must follow the workload and recovery model.

```bash
sudo mkfs.ext4 -L codefyhub-data <array>
sudo install -d -m 0750 <mountpoint>
sudo blkid <array>
```

Copy the filesystem UUID from `blkid`, then add an reviewed `/etc/fstab` entry using that UUID—not `/dev/md0`:

```text
UUID=<filesystem-uuid>  /srv/data  ext4  defaults,nofail  0  2
```

Validate before rebooting:

```bash
sudo mount -a
findmnt <mountpoint>
df -hT <mountpoint>
sudo touch <mountpoint>/.codefyhub-write-test
sudo rm <mountpoint>/.codefyhub-write-test
```

Expected outcome: `findmnt` reports the intended MD-backed filesystem at the intended mount point and the write/remove test succeeds.

## Monitoring and security implications

Configure `MAILADDR` and `PROGRAM` only when the target environment has a working, monitored delivery path. A local mail address without a mail transport silently loses alerts. Use the downloadable artifact as a starting point and validate delivery end to end.

Enable the distribution-provided monitor unit if it exists on the installed release:

```bash
systemctl list-unit-files 'mdmonitor*'
sudo systemctl enable --now mdmonitor.service
systemctl status mdmonitor.service --no-pager
```

Also monitor:

- `/proc/mdstat` and `mdadm --detail` state.
- SMART/NVMe health and kernel I/O errors.
- Filesystem capacity and inode use.
- Backup success **and** restore success.
- Rebuild duration and application latency during reconstruction.

RAID metadata exposes no confidentiality boundary. Encrypt data where the threat model requires it, protect initramfs and recovery keys, and restrict who may run destructive storage commands.

## Verification checklist

- [ ] `mdadm --detail <array>` shows `State : clean` or a documented synchronization state.
- [ ] `/proc/mdstat` shows both expected members as `U` after synchronization.
- [ ] The filesystem is mounted by UUID at the intended path.
- [ ] A controlled reboot reassembles and mounts the array without manual intervention.
- [ ] Alert delivery reaches the monitored destination.
- [ ] The service passes its own read/write validation.
- [ ] A representative backup restore succeeds outside the array.
- [ ] Device identity and physical slot records are current.

Do not mark this guide lab-tested for a deployment until the exact environment and evidence are recorded.

## Troubleshooting

| Symptom | Distinguishing diagnostic | Likely direction |
|---|---|---|
| Array is absent after reboot | `sudo mdadm --assemble --scan --verbose` | Review duplicate/missing `ARRAY` entries and initramfs regeneration |
| Array shows `_U` or `U_` | `sudo mdadm --detail <array>` | Follow the degraded-array runbook; do not recreate the array |
| Member repeatedly drops | `sudo dmesg --level=err,warn` and device health data | Investigate cable, power, controller, enclosure, or media failure |
| Mount fails but array is active | `sudo fsck -n <array>` from an unmounted maintenance state | Treat as a filesystem incident, not an MD assembly problem |
| Rebuild is slow | `cat /proc/mdstat`, `iostat -xz 1`, service latency | Reduce competing I/O only under an approved operational decision |

Never use `mdadm --create`, `--zero-superblock`, or a forced assembly as a generic repair command. Those actions can destroy the evidence needed for recovery.

## Rollback and recovery

Before application data is written, rollback means unmounting the new filesystem, removing its reviewed `/etc/fstab` entry, restoring the previous mdadm configuration, updating initramfs, stopping the new array, and only then clearing signatures if the disks are confirmed disposable.

After application data is written, there is no assumed command-level rollback. Stop writes, preserve array state, and restore or migrate from a verified independent backup according to the approved recovery plan.

The degraded member replacement procedure is documented in [Recover a degraded mdadm RAID 1 array](/guides/storage-raid/degraded-mdadm-recovery).

