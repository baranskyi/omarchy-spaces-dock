"""System stats for Spaces Dock: prints one JSON snapshot every two seconds.

Read-only, standard library only. Follows the approach of the Konostat plugin
(konochi.konostat): /proc for CPU and memory, hwmon for temperatures and fans,
sysfs for GPUs and network counters, statvfs for disks.

Only the metrics passed with --metrics are collected. NVIDIA GPUs are queried
through nvidia-smi only when the GPU metric is on and the card is already
awake, so the dock never keeps a hybrid laptop's discrete GPU from sleeping.
"""

import argparse
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import time

ALL_METRICS = ("cpu", "memory", "temperature", "gpu", "storage", "network", "fans")
CPU_CHIPS = re.compile(r"^(coretemp|k10temp|zenpower|cpu_thermal|cpu)", re.I)


def read(path, default=""):
    try:
        return Path(path).read_text().strip()
    except (OSError, UnicodeError):
        return default


def number(path):
    try:
        return float(read(path))
    except ValueError:
        return None


def cpu_ticks():
    fields = read("/proc/stat").splitlines()[0].split()[1:9]
    values = [int(v) for v in fields]
    # idle + iowait count as idle; guest time is already inside user/nice.
    return sum(values), values[3] + values[4]


def cpu_percent(previous, current):
    if previous is None:
        return None
    total, idle = current[0] - previous[0], current[1] - previous[1]
    if total <= 0:
        return None
    return round(max(0.0, min(100.0, 100.0 * (total - idle) / total)), 1)


def memory():
    fields = {}
    for line in read("/proc/meminfo").splitlines():
        key, _, value = line.partition(":")
        parts = value.split()
        if parts:
            fields[key] = int(parts[0]) * 1024
    total = fields.get("MemTotal", 0)
    available = fields.get("MemAvailable", fields.get("MemFree", 0))
    used = max(0, total - available)
    return {
        "total": total,
        "used": used,
        "percent": round(100.0 * used / total, 1) if total else None,
        "swapTotal": fields.get("SwapTotal", 0),
        "swapUsed": max(0, fields.get("SwapTotal", 0) - fields.get("SwapFree", 0)),
    }


def hwmon(kind, scale):
    rows = []
    for hw in sorted(Path("/sys/class/hwmon").glob("hwmon*")):
        chip = read(hw / "name", hw.name)
        for path in sorted(hw.glob(kind + "*_input")):
            value = number(path)
            if value is None:
                continue
            value /= scale
            if kind == "temp" and not -30 <= value <= 150:
                continue
            stem = path.name[: -len("_input")]
            rows.append({"chip": chip, "name": read(hw / (stem + "_label"), stem), "value": round(value, 1)})
    return rows


def temperature():
    sensors = hwmon("temp", 1000)
    if not sensors:
        for zone in sorted(Path("/sys/class/thermal").glob("thermal_zone*")):
            value = number(zone / "temp")
            if value is not None and -30 <= value / 1000 <= 150:
                sensors.append({"chip": read(zone / "type", zone.name), "name": zone.name, "value": round(value / 1000, 1)})
    return {"cpu": cpu_temperature(sensors), "sensors": sensors}


def cpu_temperature(sensors):
    """CPU package temperature, else the hottest CPU core, else the hottest sensor."""
    cpu = [s for s in sensors if CPU_CHIPS.match(s["chip"])]
    for s in cpu:
        if re.match(r"^(package|tctl|tdie)", s["name"], re.I):
            return s["value"]
    pool = cpu or sensors
    return max((s["value"] for s in pool), default=None)


def nvidia_awake(card):
    status = read(card / "device" / "power" / "runtime_status", "active")
    return status == "active"


def gpus():
    devices, nvidia_cards = [], []
    for card in sorted(Path("/sys/class/drm").glob("card[0-9]*")):
        if not re.fullmatch(r"card\d+", card.name):
            continue
        dev = card / "device"
        vendor = read(dev / "vendor")
        if vendor == "0x10de":
            nvidia_cards.append(card)
            continue
        name = {"0x8086": "Intel", "0x1002": "AMD"}.get(vendor, "GPU")
        frequency = number(card / "gt_cur_freq_mhz")
        if frequency is None:
            frequency = number(dev / "gt_cur_freq_mhz")
        devices.append({
            "name": name, "percent": number(dev / "gpu_busy_percent"), "frequencyMHz": frequency,
            "memoryUsed": number(dev / "mem_info_vram_used"), "memoryTotal": number(dev / "mem_info_vram_total"),
            "temperature": None, "asleep": False,
        })
    for card in nvidia_cards:
        if not nvidia_awake(card) or not shutil.which("nvidia-smi"):
            devices.append({"name": "NVIDIA", "percent": None, "frequencyMHz": None, "memoryUsed": None,
                            "memoryTotal": None, "temperature": None, "asleep": True})
            continue
        try:
            result = subprocess.run(
                ["nvidia-smi", "--query-gpu=name,utilization.gpu,memory.used,memory.total,temperature.gpu",
                 "--format=csv,noheader,nounits"],
                capture_output=True, text=True, timeout=1.5, check=True)
        except (OSError, subprocess.SubprocessError):
            continue
        for line in result.stdout.splitlines():
            name, *raw = [part.strip() for part in line.split(",")]
            values = []
            for value in raw:
                try:
                    values.append(float(value))
                except ValueError:
                    values.append(None)
            if len(values) != 4:
                continue
            busy, used, total, temp = values
            devices.append({
                "name": name, "percent": busy, "frequencyMHz": None,
                "memoryUsed": used * 1024 ** 2 if used is not None else None,
                "memoryTotal": total * 1024 ** 2 if total is not None else None,
                "temperature": temp, "asleep": False,
            })
    return devices


def storage():
    result, seen = [], set()
    for line in read("/proc/self/mountinfo").splitlines():
        left, _, right = line.partition(" - ")
        fields, fs = left.split(), right.split()
        if len(fields) < 5 or len(fs) < 2:
            continue
        mount = re.sub(r"\\([0-7]{3})", lambda m: chr(int(m[1], 8)), fields[4])
        if not fs[1].startswith("/dev/") or mount.startswith(("/run/", "/boot", "/efi")):
            continue
        device = (fields[2], fs[1])
        if device in seen:
            continue
        try:
            usage = os.statvfs(mount)
        except OSError:
            continue
        total, free = usage.f_blocks * usage.f_frsize, usage.f_bavail * usage.f_frsize
        used = (usage.f_blocks - usage.f_bfree) * usage.f_frsize
        if not total:
            continue
        seen.add(device)
        result.append({"mount": mount, "total": total, "used": used, "free": free,
                       "percent": round(100.0 * used / (used + free), 1) if used + free else 0.0})
    return sorted(result, key=lambda row: (row["mount"] != "/", row["mount"]))


def network_counters():
    counters = {}
    for interface in Path("/sys/class/net").iterdir():
        # Physical interfaces that are up: no loopback, VPN or bridge duplicates.
        if not (interface / "device").exists() or read(interface / "operstate") != "up":
            continue
        rx, tx = number(interface / "statistics/rx_bytes"), number(interface / "statistics/tx_bytes")
        if rx is not None and tx is not None:
            counters[interface.name] = (rx, tx)
    return counters


def network_rates(previous, current, elapsed):
    rows = []
    for name, counters in sorted(current.items()):
        old = previous.get(name)
        if old and elapsed > 0:
            down, up = (max(0.0, (now - before) / elapsed) for now, before in zip(counters, old))
        else:
            down, up = 0.0, 0.0
        rows.append({"name": name, "download": down, "upload": up})
    return {"interfaces": rows, "download": sum(r["download"] for r in rows),
            "upload": sum(r["upload"] for r in rows)}


class Collector:
    def __init__(self, metrics):
        self.metrics = set(metrics)
        self.cpu = None
        self.network = {}
        self.network_time = None
        self.storage = []
        self.storage_time = -60.0
        self.cpu_name = next((line.split(":", 1)[1].strip() for line in read("/proc/cpuinfo").splitlines()
                              if line.startswith("model name")), "CPU")

    def snapshot(self):
        now = time.monotonic()
        out = {"metrics": sorted(self.metrics), "updatedAt": time.time()}
        if "cpu" in self.metrics:
            ticks = cpu_ticks()
            out["cpu"] = {"name": self.cpu_name, "percent": cpu_percent(self.cpu, ticks),
                          "threads": os.cpu_count(), "load": [round(v, 2) for v in os.getloadavg()]}
            self.cpu = ticks
        if "memory" in self.metrics:
            out["memory"] = memory()
        if "temperature" in self.metrics:
            out["temperature"] = temperature()
        if "fans" in self.metrics:
            out["fans"] = [{"name": f["chip"] + " " + f["name"], "value": f["value"]} for f in hwmon("fan", 1)]
        if "gpu" in self.metrics:
            out["gpu"] = gpus()
        if "storage" in self.metrics:
            if now - self.storage_time >= 30:
                self.storage = storage()
                self.storage_time = now
            out["storage"] = self.storage
        if "network" in self.metrics:
            counters = network_counters()
            elapsed = now - self.network_time if self.network_time else 0
            out["network"] = network_rates(self.network, counters, elapsed)
            self.network, self.network_time = counters, now
        return out


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--metrics", default=",".join(ALL_METRICS),
                        help="comma-separated: " + ",".join(ALL_METRICS))
    parser.add_argument("--interval", type=float, default=2.0)
    parser.add_argument("--once", action="store_true", help="print one snapshot and exit")
    args = parser.parse_args()
    metrics = [m for m in args.metrics.split(",") if m in ALL_METRICS]
    collector = Collector(metrics)
    # CPU and network rates need a previous sample; take one so the first
    # line already carries real numbers.
    collector.snapshot()
    time.sleep(0.5)
    while True:
        start = time.monotonic()
        try:
            print(json.dumps(collector.snapshot(), ensure_ascii=False, allow_nan=False), flush=True)
        except BrokenPipeError:
            return
        if args.once:
            return
        time.sleep(max(0.2, args.interval - (time.monotonic() - start)))


if __name__ == "__main__":
    main()
