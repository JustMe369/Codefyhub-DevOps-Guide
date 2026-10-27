## Condition and safety boundary

Use this runbook when a Linux MD RAID 1 array reports one missing, removed, or faulty member while the remaining member is still serving data. The objective is to preserve the authoritative surviving copy, identify the failed component correctly, add one known replacement, and verify reconstruction.

> **Danger:** choosing the wrong member can turn a degraded but recoverable mirror into total data loss. Do not use `mdadm --create`, `--zero-superblock`, filesystem repair, or forced assembly as an initial response. Stop if array identity or member freshness is uncertain.

This runbook is source-reviewed for Ubuntu Server 24.04 LTS and mdadm 4.x. It has not been executed against this project’s production infrastructure.

## Trigger symptoms

Possible symptoms include:

- An alert reports a degraded MD device.
- `/proc/mdstat` shows `_U` or `U_` rather than `[UU]`.
- `mdadm --detail` reports `degraded`, `removed`, or `faulty`.
- The kernel reports repeated I/O errors for a member path.
- A member is missing after reboot or enclosure maintenance.

These symptoms do not prove that the disk media failed. Cabling, power, controller paths, enclosure slots, device-name changes, or an incomplete assembly can produce similar evidence.

## Variables and prerequisites

Record these values in the incident log before making changes:

| Variable | Example | Rule |
|---|---|---|
| `<array>` | `/dev/md0` | Confirm using `/proc/mdstat` and `mdadm --detail` |
| `<failed-member>` | `/dev/disk/by-id/ata-FAILED_SERIAL` | Must match recorded serial and slot evidence |
| `<replacement>` | `/dev/disk/by-id/ata-NEW_SERIAL` | Must be unused and at least as large |
| `<mountpoint>` | `/srv/data` | Used for service-level validation |

Required conditions:

- Independent console access is working.
- The incident owner understands the current service impact.
- A restore-tested backup exists outside the array.
- The remaining member is readable and no second-member errors are increasing.
- The replacement device’s model, serial, size, and slot are recorded.

If the only surviving member reports growing I/O errors, prioritize data preservation and specialist recovery rather than starting a high-I/O rebuild.

## Phase 1: collect read-only evidence

Run from the affected host with sudo privileges:

```bash
date --iso-8601=seconds
hostnamectl
cat /proc/mdstat
sudo mdadm --detail <array>
lsblk -e7 -o NAME,PATH,SIZE,MODEL,SERIAL,TYPE,FSTYPE,MOUNTPOINTS
findmnt --real
sudo dmesg --level=err,warn | tail -n 100
```

For each visible candidate member:

```bash
sudo mdadm --examine /dev/disk/by-id/<member-id>
sudo smartctl -x /dev/disk/by-id/<member-id>
```

Preserve this output with the incident record. Representative degraded status may include:

```text
State : clean, degraded
Active Devices : 1
Working Devices : 1
Failed Devices : 1
```

The exact field order and wording vary. Confirm the array UUID, RAID level, expected device count, active member, and event counters.

## Decision table

| Evidence | Confirmed cause? | Action |
|---|---|---|
| Device has media errors and the same serial is marked faulty | Likely member failure | Replace the confirmed member |
| Device disappears with link resets or power errors | Not yet | Inspect cable, power, controller, and enclosure path |
| Both members exist but array did not assemble | Not yet | Compare array UUID and event counters; investigate assembly configuration |
| Filesystem errors occur while array is `[UU]` | No MD member failure proven | Follow filesystem/application recovery, not this replacement path |
| Both members have errors or freshness is ambiguous | No safe automatic action | Stop writes and escalate to storage recovery expertise |

## Phase 2: stabilize service risk

Reduce avoidable writes if the service can tolerate it. Do not stop an array merely because it is degraded; stopping may make a still-readable service unavailable and complicate assembly.

Confirm the backup control plane is not storing its only copy on the affected array. If the service is critical and a tested failover target exists, consider failing over before reconstruction because rebuild I/O increases load on the surviving member.

## Phase 3: fail and remove one confirmed member

If mdadm has not already marked the **confirmed** member faulty, mark it and remove it using the path shown by `mdadm --detail`:

```bash
sudo mdadm <array> --fail <failed-member>
sudo mdadm <array> --remove <failed-member>
sudo mdadm --detail <array>
```

Expected outcome: the old member is absent from active devices and the array remains active with exactly one known-good member. If the command names a different serial than the incident record, stop.

Replace the physical device according to the hardware procedure. Re-scan and identify the new device without relying on its `/dev/sdX` name:

```bash
sudo udevadm settle
lsblk -e7 -o NAME,PATH,SIZE,MODEL,SERIAL,TYPE,FSTYPE,MOUNTPOINTS
sudo wipefs --no-act <replacement>
sudo mdadm --examine <replacement>
```

Unexpected signatures or a smaller device are stop conditions.

## Phase 4: add the replacement

Add only the verified replacement:

```bash
sudo mdadm <array> --add <replacement>
cat /proc/mdstat
sudo mdadm --detail <array>
```

Representative reconstruction state resembles:

```text
md0 : active raid1 replacement[2] survivor[0]
      976630336 blocks super 1.2 [2/1] [U_]
      [====>................]  recovery = 22.0%
```

Do not promise a universal completion time. Capacity, device latency, bitmap state, competing I/O, and kernel limits affect reconstruction.

## Phase 5: monitor reconstruction

Monitor both infrastructure and user impact:

```bash
watch -n 10 cat /proc/mdstat
sudo journalctl -kf
sudo mdadm --detail <array>
```

If available, observe block-device latency with the approved host tooling. Alert and reconsider the plan when:

- The surviving member reports new I/O errors.
- Reconstruction repeatedly restarts or stalls.
- Application latency or error rate exceeds the incident threshold.
- The replacement disappears or reports health failures.

Do not increase rebuild speed blindly. A faster rebuild can increase application latency and stress the surviving device.

## Verification checklist

After reconstruction finishes:

```bash
cat /proc/mdstat
sudo mdadm --detail <array>
findmnt <mountpoint>
sudo dmesg --level=err,warn | tail -n 100
```

Verify all of the following:

- [ ] `/proc/mdstat` shows `[UU]` and no active recovery operation.
- [ ] `mdadm --detail` reports both intended serial-backed members and a clean state.
- [ ] The filesystem remains mounted at the expected mount point.
- [ ] The application passes read/write or transaction-level health checks.
- [ ] No new device or controller errors appear in the kernel log.
- [ ] Alerting returns to healthy and a test notification is received.
- [ ] The member inventory and physical slot record are updated.
- [ ] A backup created after recovery is restored in an isolated location.

Array completion proves redundancy was restored. It does not prove application consistency or recoverability.

## Troubleshooting matrix

| Symptom | Diagnostic that separates causes | Response |
|---|---|---|
| `mdadm: cannot open <array>` | `cat /proc/mdstat`; `sudo mdadm --assemble --scan --verbose` | Confirm whether the array is unassembled; do not recreate it |
| Replacement reports “not large enough” | Compare sector counts with `sudo blockdev --getsz` | Use a device with equal or greater usable sectors |
| “Device or resource busy” | `lsblk`, `findmnt`, `sudo lsof <replacement>` | Remove unintended mounts or consumers only after ownership is confirmed |
| Recovery remains at the same percentage | Check kernel errors, device latency, and `/sys/block/<md>/md/sync_action` | Investigate I/O failure or a paused action before changing speed limits |
| Array is clean but service fails | Validate filesystem, permissions, database/application state | Transfer to the relevant service recovery runbook |

## Abort, rollback, and recovery

Removing a failed member is not logically reversible once hardware is replaced and reconstruction begins. Preserve the original failed device unchanged until data integrity and backup restore are verified; do not clear its metadata as part of this runbook.

Abort the replacement workflow and escalate when:

- Member identity is ambiguous.
- Both members show damage.
- Array UUIDs or event counters conflict.
- The surviving member develops errors.
- The filesystem or application requires repair beyond simple validation.

If the array becomes unreadable, stop repeated assembly attempts, preserve devices and logs, and restore to separate storage from the last verified backup. Recovery must not overwrite the only remaining evidence.

For initial construction and monitoring configuration, see [Build and operate Linux software RAID safely](/guides/storage-raid/mdadm-zfs).

