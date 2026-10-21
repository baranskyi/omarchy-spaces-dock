"""AI subscription limits for Spaces Dock: prints one JSON object and exits.

Runs one usage collector per provider, in parallel, and keeps only what the
dock draws: the plan name, a status message, and the limit windows (label,
fraction used, reset time). Collectors print Omarchy's agent usage record:

  claude  /usr/bin/omarchy-agent-usage-claude --limits-only   (ships with Omarchy)
  codex   /usr/bin/omarchy-agent-usage-codex --limits-only    (ships with Omarchy)
  grok    collectors/grok-usage --limits-only --no-refresh    (bundled here)

The Grok collector only reads ~/.grok/auth.json unless --grok-refresh is
given; then it may renew an expiring Grok CLI token and rewrite that file.

Output: {"updatedAt": ISO, "providers": {id: {"available", "plan", "status",
"stale", "updatedAt", "limits": [{"label", "title", "percent", "resetsAt"}]}}}
Standard library only. Never prints credentials: collectors read their own.
"""

import argparse
import concurrent.futures
import datetime as dt
import json
import os
from pathlib import Path
import subprocess
import sys

HERE = Path(__file__).resolve().parent

COLLECTORS = {
    "claude": ["/usr/bin/omarchy-agent-usage-claude", "--limits-only"],
    "codex": ["/usr/bin/omarchy-agent-usage-codex", "--limits-only"],
    "grok": [sys.executable or "/usr/bin/python3", "-B", str(HERE / "collectors" / "grok-usage"), "--limits-only", "--no-refresh"],
}


def allow_grok_refresh():
    COLLECTORS["grok"] = [arg for arg in COLLECTORS["grok"] if arg != "--no-refresh"]


def unavailable(status):
    return {"available": False, "plan": "", "status": status, "stale": False, "updatedAt": "", "limits": []}


def clean_limits(raw):
    out = []
    for item in raw if isinstance(raw, list) else []:
        if not isinstance(item, dict):
            continue
        try:
            percent = float(item.get("percent"))
        except (TypeError, ValueError):
            continue
        out.append({
            "label": str(item.get("label") or ""),
            "title": str(item.get("title") or ""),
            "percent": max(0.0, min(1.0, percent)),
            "resetsAt": str(item.get("resetsAt") or ""),
        })
    return out


def summarize(record):
    if not isinstance(record, dict):
        return unavailable("Unreadable usage record")
    return {
        "available": True,
        "plan": str(record.get("tierLabel") or ""),
        "status": str(record.get("usageStatusText") or ""),
        "stale": bool(record.get("limitsStale")),
        "updatedAt": str(record.get("updatedAt") or ""),
        "limits": clean_limits(record.get("limits")),
    }


def collect(provider, timeout):
    command = COLLECTORS[provider]
    executable = command[2] if provider == "grok" else command[0]
    if not os.path.exists(executable):
        return provider, unavailable("Collector not found: " + executable)
    try:
        result = subprocess.run(command, capture_output=True, text=True, timeout=timeout, check=False)
    except subprocess.TimeoutExpired:
        return provider, unavailable("Timed out reading limits")
    except OSError as error:
        return provider, unavailable("Could not run collector: " + error.strerror)
    lines = [line for line in result.stdout.splitlines() if line.strip()]
    if not lines:
        return provider, unavailable("No usage record (exit " + str(result.returncode) + ")")
    try:
        return provider, summarize(json.loads(lines[-1]))
    except json.JSONDecodeError:
        return provider, unavailable("Unreadable usage record")


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--providers", default=",".join(COLLECTORS), help="comma-separated: " + ",".join(COLLECTORS))
    parser.add_argument("--timeout", type=float, default=60.0)
    parser.add_argument("--grok-refresh", action="store_true",
                        help="let the Grok collector renew an expiring Grok CLI token (rewrites ~/.grok/auth.json)")
    args = parser.parse_args()
    if args.grok_refresh:
        allow_grok_refresh()
    providers = [p for p in args.providers.split(",") if p in COLLECTORS]
    results = {}
    if providers:
        with concurrent.futures.ThreadPoolExecutor(max_workers=len(providers)) as pool:
            for provider, summary in pool.map(lambda p: collect(p, args.timeout), providers):
                results[provider] = summary
    # A cold Codex app-server sometimes misses the first request; one more
    # try, after the parallel round, usually answers.
    for provider in providers:
        if results[provider]["available"] and not results[provider]["limits"]:
            results[provider] = collect(provider, args.timeout)[1]
    print(json.dumps({"updatedAt": dt.datetime.now(dt.timezone.utc).isoformat(), "providers": results},
                     ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
