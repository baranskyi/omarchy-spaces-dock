# Changelog

## 0.6.0

- A QuickFile button pill, left of the player by default and draggable like the others. It opens the QuickFile plugin, turns it on if it is installed but off, or opens a terminal that offers to install it from the Omarchy plugin marketplace. Setting `showQuickfile`, in the Pills tab; IPC `quickfile`.

## 0.5.4

- The settings panel is split into tabs: Dock, Workspaces (with behavior and previews), Icons, Look (appearance and animation) and Pills (player, AI limits, system stats). Tab cycles the tabs while the panel is open.

## 0.5.3

- Renewing the Grok CLI token is now opt-in (`limitGrokRefresh`, "Refresh Grok sign-in"), off by default. Without it the bundled Grok collector only reads `~/.grok/auth.json`.
- README: requirements, removal, and what the dock reads and writes.
- Marketplace preview image.

## 0.5.2

- Fix: left clicks on the player, AI limits and stats pills did nothing since 0.5.0. The drag layer over each pill now owns the press and hands it on as a click when the pointer does not move past the drag threshold, so play, previous, next, the system panel and refreshing work again.
- Clicking the cover or title focuses the player's window through Hyprland first. Spotify claims it can raise itself over MPRIS but ignores the request on Linux.

## 0.5.1

- The player appears as soon as Spotify starts, not only once music plays. Until a track is picked it shows "Spotify" and a play button.

## 0.5.0

- Drag the player, AI limits and stats pills to reorder them on either side of the workspace pill, which always stays centered. The order is saved as `islandOrder`.
- The AI limit rings show the Claude, ChatGPT and Grok Bot app logos in the middle, cut to a circle.
- Tooltips with several lines are left-aligned, and the AI limits tooltip is a tidy table of window, percentage and time to reset.

## 0.4.0

- An AI limits island between the dock and the system stats: two concentric rings each for Claude, OpenAI and Grok, outer for the 5-hour session, inner for the week. Tooltips show percentages and reset times; click refreshes.
- `llm_limits.py` runs Omarchy's Claude and Codex usage collectors and a bundled Grok collector every five minutes, with one retry, and the dock keeps the last good numbers when a refresh fails.
- Settings: `showLimits`, `limitClaude`, `limitCodex`, `limitGrok`. IPC: `refreshLimits`.

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
