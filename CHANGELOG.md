# Changelog

## 0.3.2

- Removed the last links to the Spaces bar widget: the `copyBarSettings` IPC call and the hook's extra notification. The dock depends on no other plugin.

## 0.3.1

- Mouse buttons on the stats swapped: click opens the system panel, right-click opens btop.

## 0.3.0

- Right-click the stats for a system panel, forked from the System Monitor plugin by Harshith Chennupati: host, uptime and load, CPU, memory and temperature cards, a two-minute chart, per-core load, network, disk and capacity. Its first button opens the dock settings instead of cycling a bar mode.
- Stat pills are coloured by load: yellow from 80% or 85°C, red from 95% or 95°C, no colour otherwise.
- The stats island is narrower.
- IPC: `system` toggles the system panel.

## 0.2.0

- A player island left of the dock: cover art, track, artist and playback buttons. Spotify by default, or any MPRIS player.
- A system stats island right of the dock: CPU, GPU, memory, storage, network, fans and CPU temperature, with details on hover and btop on click.
- Both are separate pills beside the centered dock, or the ends of the strip in full-width mode, and both have their own settings sections.
- `stats.py` collects only the enabled metrics and never wakes a sleeping NVIDIA GPU.
- IPC: `playPause`, `next` and `previous`.

## 0.1.0

First release: Spaces moved from the bar into a dock at the bottom of the screen.

- The dock is a `keepLoaded` service plugin with its own layer-shell window per monitor.
- New settings: dock height, alignment, monitors, bottom margin, reserve space, and hide with the bar.
- Icon size now goes up to 64 px. Pills, labels, spacing and badges scale with the dock height.
- The settings panel and previews open upward from the dock.
- Tooltips get their own window above the dock. Hovered items now report `tooltipHovered`, which the upstream widget lacked, so its tooltips never showed.
- Settings can be copied from the Spaces bar widget over IPC.
- The agent hook notifies both the dock and the Spaces bar widget.

Forked from Spaces 1.0.0 by Tornike Gomareli, commit f8306d7.
