# Spaces Dock

A large workspace dock for the bottom of the screen in [Omarchy](https://omarchy.org). It is a fork of [Spaces](https://github.com/tornikegomareli/omarchy-spaces) by Tornike Gomareli, moved out of the bar into its own dock so it can be much bigger.

Everything Spaces does works here too:

- Each workspace is a pill that shows the icons of the apps open on it.
- Hovering another workspace shows a live miniature of its windows.
- Coding agents running in a terminal get a badge: a spinner while working, a pulse when they need input, a check mark when done.
- Urgent windows pulse their workspace.
- Scrolling switches workspaces, and middle-click can close a window.
- Right-click the dock to open its settings.

Four islands sit beside the dock as separate pills:

- **QuickFile button, far left:** opens the [QuickFile](https://github.com/baranskyi/omarchy-quickfile) sidebar plugin, like its SUPER+B binding. If QuickFile is installed but turned off, a click turns it on. If it is not installed, a click opens a terminal with `omarchy plugin add` for it from the Omarchy plugin marketplace, which asks before installing anything. The dock never loads QuickFile's code.

- **Player, on the left:** cover art, track and artist, and previous, play and next buttons. It shows Spotify by default, or any MPRIS player. Spotify appears as soon as it starts, even before a track is picked; other players only while they have a track. Click the cover or title to jump to the player's window.
- **AI limits, between the dock and the stats:** two concentric rings each for Claude, OpenAI (Codex) and Grok, in the providers' colours, with the provider's logo in the middle. The outer ring is the 5-hour session window, the inner ring the weekly window. Hover a pair for exact percentages and reset times, click to refresh. Logos come from the installed Claude, ChatGPT and Grok Bot apps; without them a letter stands in.
- **System stats, on the right:** CPU, GPU, memory, storage, network, fans, CPU temperature and battery, like the Konostat plugin. CPU, memory, temperature and battery are on by default; the battery only appears on computers that have one. Hover a value for details, click it for the system panel, right-click it to open btop. Click the battery to switch the power profile.

Each stat is a ring that fills with the load and has its icon in the middle, like the AI limits; switch **Style** to **Values** for pills with numbers instead. Temperature fills from 30 to 100 °C, fans at 6000 RPM, network on a log scale up to 100 MiB/s, and the battery with its charge. The battery icon gets a bolt while it is plugged in. The exact number is in the tooltip, and for the battery also the time left or until full, the power draw and the battery's health.

A stat has no alarm colour while things are normal: the ring uses the dock's text colour. It turns yellow under heavy load or heat and red at the extreme. Both are fixed colours, so they mean the same in every theme:

| Metric | Yellow from | Red from |
|---|---|---|
| CPU, GPU, memory, storage | 80% | 95% |
| CPU or GPU temperature | 85°C | 95°C |
| Battery, only while running on it | 20% or less | 10% or less |

Network and fans are never coloured.

Clicking the battery opens a power profile picker above it: Performance, Balanced and Power saver as rings stacked from top to bottom, with the active one filled. Hover a ring or use the arrow keys to see its name, click it or press Enter to switch, and Esc closes the picker. The switch goes through Omarchy's `omarchy-powerprofiles-set`, so the choice is remembered separately for AC and battery, like in Omarchy's power menu. Profiles the machine does not offer are left out.

The system panel opens above the stats on click. It is the System Monitor panel: host, uptime and load, CPU, memory and temperature cards, a two-minute CPU and memory chart, per-core load, network and disk activity, and disk and swap capacity. Its buttons open the dock settings and btop.

Drag the QuickFile, player, AI limits and stats pills to reorder them, on either side of the workspace pill. The workspace pill always stays centered, and the order is saved.

The dock adds its own settings on top: height, alignment, which monitors, a bottom margin, whether windows make room for it, and hiding together with the bar.

It is self-contained: it does not need Spaces or any other plugin installed.

## Requirements

Everything it needs ships with Omarchy, and it needs no other plugin:

- Omarchy 4 (Quattro) with omarchy-shell and Quickshell
- `python3` for the system stats and AI limits collectors, standard library only
- `btop` for right-click on the stats
- For the power profile picker: Omarchy's `omarchy-powerprofiles-list` and `omarchy-powerprofiles-set` with power-profiles-daemon
- For AI limits: Omarchy's `omarchy-agent-usage-claude` and `omarchy-agent-usage-codex`, plus Claude Code, the Codex CLI or the Grok CLI signed in. Each provider is optional.
- Optional: `nvidia-smi` for an NVIDIA GPU, only queried while the GPU is awake

## Install

From GitHub:

```bash
omarchy plugin add https://github.com/baranskyi/omarchy-spaces-dock.git --enable
```

From a local checkout:

```bash
ln -sfn "$PWD" ~/.config/omarchy/plugins/io.github.baranskyi.spaces-dock
omarchy-shell shell rescanPlugins
omarchy plugin enable io.github.baranskyi.spaces-dock
```

The dock appears at once on every monitor.

## Remove

Turn it off and keep it installed:

```bash
omarchy plugin disable io.github.baranskyi.spaces-dock
```

Remove it completely:

```bash
omarchy plugin remove io.github.baranskyi.spaces-dock
```

The dock leaves nothing else behind except small caches in `~/.cache/omarchy/agent-usage`, which Omarchy's own usage collectors share.

## Use

| Action | Result |
|---|---|
| Click a pill | Focus that workspace |
| Click an app icon | Focus that window. On a grouped icon that is already focused, cycle its windows |
| Hover another workspace | Live preview above the dock. Click a window in it to jump there |
| Scroll over the dock | Step through workspaces |
| Middle-click an icon | Close that window, when enabled |
| Right-click the dock, or its gear | Settings |

## Settings

Settings live on the plugin's entry in the `plugins` list of `~/.config/omarchy/shell.json`. The settings panel writes them there.

Dock settings:

| Key | Values | Default |
|---|---|---|
| `dockHeight` | 40 to 96 px | 56 |
| `alignment` | `center` (pill sized to content), `full` (edge to edge) | `center` |
| `monitors` | `all`, `primary` (lowest Hyprland monitor id), or an output name such as `HDMI-A-1` | `all` |
| `bottomMargin` | 0 to 64 px | 0 |
| `reserveSpace` | `true` (windows stop above the dock), `false` (floats over them) | `true` |
| `hideWithBar` | `true` hides the dock while the bar is toggled off | `true` |
| `islandOrder` | left-to-right ids: `quickfile`, `player`, `spaces`, `limits`, `stats` | `["quickfile", "player", "spaces", "limits", "stats"]` |
| `showQuickfile` | bool, the QuickFile button pill | `true` |

A named monitor that is not connected falls back to `all`, so unplugging it never leaves you without a dock.

Player and system stats:

| Key | Values | Default |
|---|---|---|
| `showPlayer` | bool | `true` |
| `playerSource` | `spotify`, `any` (any MPRIS player) | `spotify` |
| `playerControls` | bool, previous / play / next buttons | `true` |
| `showStats` | bool | `true` |
| `statsStyle` | `rings` (filling ring with the icon), `values` (icon and number) | `rings` |
| `statCpu`, `statMemory`, `statTemperature`, `statBattery` | bool | `true` |
| `statGpu`, `statStorage`, `statNetwork`, `statFans` | bool | `false` |

AI limits:

| Key | Values | Default |
|---|---|---|
| `showLimits` | bool | `true` |
| `limitClaude`, `limitCodex`, `limitGrok` | bool | `true` |
| `limitGrokRefresh` | bool, renew the Grok CLI token when it expires | `false` |

In full-width mode the player sits at the left end of the strip, the limits and stats at the right end.

### Where the AI limits come from

`llm_limits.py` runs one collector per provider every five minutes and passes the dock only percentages, reset times, the plan name and a status message:

| Provider | Collector |
|---|---|
| Claude | `omarchy-agent-usage-claude`, part of Omarchy |
| OpenAI | `omarchy-agent-usage-codex`, part of Omarchy |
| Grok | `collectors/grok-usage`, bundled with the dock |

The collectors use the sign-ins of Claude Code, the Codex CLI and the Grok CLI already on the machine, and ask each provider's usage endpoint. A provider you are not signed in to simply does not appear. Codex and Grok currently report a weekly window only, so their outer ring stays empty. If a refresh fails, the dock keeps the last numbers and dims the rings.

The dock only reads these sign-ins. The Grok CLI's token expires within hours; turn on **Refresh Grok sign-in** (`limitGrokRefresh`) to let the bundled collector renew it the way the Grok CLI does, which rewrites `~/.grok/auth.json`. It is off by default.

The bundled Grok collector reads only the sign-in, never your Grok session history. Its short-lived limits cache lives in `~/.cache/omarchy/agent-usage`, which it keeps owner-only (directory `0700`, files `0600`).

What the dock writes: its own entry in `~/.config/omarchy/shell.json`, only when you change a setting or drag a pill.

The stats come from `stats.py`, a small Python script that prints a snapshot every two seconds and only collects the metrics that are on. With the GPU metric on, an NVIDIA card is only queried while it is already awake, so the dock never keeps a hybrid laptop's discrete GPU from sleeping.

All Spaces settings are kept, with the same keys. The only change is a wider icon range.

| Key | Values | Default |
|---|---|---|
| `showIcons` | bool | `true` |
| `showApps` | `all`, `active`, `hover`, `hoverOnly` | `hover` |
| `iconStyle` | `color`, `mono` | `color` |
| `iconSize` | 12 to 64 px | 28 |
| `maxIcons` | 1 to 20 | 8 |
| `groupApps`, `dimUnfocused`, `focusedTitle`, `agentStatus` | bool | `false`, `true`, `false`, `true` |
| `titleLength` | 8 to 60 | 24 |
| `previews`, `previewLive` | bool | `true`, `true` |
| `previewSize` | `small`, `medium`, `large` | `medium` |
| `activeStyle` | `subtle`, `solid`, `accent` | `subtle` |
| `labelStyle` | `number`, `glyph`, `none` | `number` |
| `density` | `compact`, `normal`, `roomy` | `normal` |
| `settingsButton` | `hover`, `always`, `never` | `hover` |
| `urgentHighlight`, `tooltips` | bool | `true`, `true` |
| `persistentWorkspaces` | 0 to 10 | 5 |
| `hideEmpty`, `perMonitor` | bool | `false`, `false` |
| `activeClick` | `none`, `previous` | `none` |
| `scrollSwitch`, `middleClickClose` | bool | `true`, `false` |
| `animations` | bool | `true` |
| `animationSpeed` | `slow`, `normal`, `fast` | `normal` |

To set a value from a script, edit the entry with `jq`. The shell and the dock both pick the change up on their own. `omarchy bar set` only works for bar widgets, so it cannot set these.

```bash
jq '(.plugins[] | select(.id=="io.github.baranskyi.spaces-dock")).dockHeight = 64' ~/.config/omarchy/shell.json > /tmp/shell.json && mv /tmp/shell.json ~/.config/omarchy/shell.json
```

## IPC

```bash
omarchy-shell io.github.baranskyi.spaces-dock toggle
```

| Method | Effect |
|---|---|
| `open`, `close`, `toggle` | Settings on the focused monitor's dock. `close` closes them everywhere |
| `peek <workspace>` | Show the preview for a workspace for a few seconds, for a keybinding |
| `playPause`, `next`, `previous` | Control the player shown on the dock |
| `system` | Toggle the system panel on the focused monitor's dock |
| `power` | Toggle the power profile picker above the battery |
| `quickfile` | Same as clicking the QuickFile button |
| `refreshLimits` | Fetch the AI limits now |
| `agent <session> <state> <pids>` | Used by the agent hook below |

## Agent badges

Badges need Claude Code hooks. Add these to `~/.claude/settings.json`.

```json
"hooks": {
  "UserPromptSubmit": [{ "hooks": [{ "type": "command", "command": "~/.config/omarchy/plugins/io.github.baranskyi.spaces-dock/hooks/claude-hook working", "async": true }] }],
  "PostToolUse": [{ "hooks": [{ "type": "command", "command": "~/.config/omarchy/plugins/io.github.baranskyi.spaces-dock/hooks/claude-hook working", "async": true }] }],
  "Notification": [{ "hooks": [{ "type": "command", "command": "~/.config/omarchy/plugins/io.github.baranskyi.spaces-dock/hooks/claude-hook waiting", "async": true }] }],
  "Stop": [{ "hooks": [{ "type": "command", "command": "~/.config/omarchy/plugins/io.github.baranskyi.spaces-dock/hooks/claude-hook done", "async": true }] }],
  "SessionEnd": [{ "hooks": [{ "type": "command", "command": "~/.config/omarchy/plugins/io.github.baranskyi.spaces-dock/hooks/claude-hook end", "async": true }] }]
}
```

The hook needs `jq`, which Omarchy installs.

## How it works

Bar widgets can only live inside the one active bar, which has no bottom slot. So Spaces Dock is a `service` plugin with `keepLoaded`, and it opens its own layer-shell window at the bottom of each monitor.

```
manifest.json        service plugin, keepLoaded
Service.qml          settings from shell.json, IPC, player and stats models, one DockWindow per screen
DockWindow.qml       bottom PanelWindow per monitor: dock surface, islands, tooltips, a stand-in bar for Spaces
Spaces.qml           the Spaces widget, forked: sizes follow the dock height
QuickfileIsland.qml  QuickFile button pill
PlayerIsland.qml     now-playing pill left of the dock
StatsIsland.qml      system stats right of the dock, as rings or values, coloured by load
StatRing.qml         one filling stat ring with its icon
LimitsIsland.qml     AI limits pill between the dock and the stats
LimitRings.qml       a provider's two concentric rings
Limits.qml           runs llm_limits.py every five minutes, keeps the last good numbers
llm_limits.py        runs the usage collectors in parallel, standard library only
collectors/grok-usage  Grok usage collector
SystemPanel.qml      system panel above the stats, forked from System Monitor
PowerPanel.qml       power profile picker above the battery ring
SysMetrics.qml/.js   its /proc sampler and two-minute history
Sparkline.qml        its charts
discover-sensors.sh  its CPU temperature, GPU and disk discovery
Media.qml            picks the MPRIS player to show
Stats.qml            runs stats.py and keeps its latest snapshot
stats.py             system stats collector, Python standard library only
Model.js             pure helpers: settings, dock metrics, player choice, stat formatting
tests/model.test.js  node tests for Model.js, including real stats.py and llm_limits.py runs
tests/sysmetrics.test.js, tests/discovery.test.sh
                     the System Monitor tests, adapted
hooks/claude-hook    agent status hook
```

Notes for changing it:

- `keepLoaded` keeps the dock windows alive across the shell's plugin hot reloads. Recreating windows that hold live screen captures can leave a stale layer surface behind and break screen capture. The cost is that code changes need `omarchy restart shell`.
- Every size inside the dock comes from `Model.dockMetrics`, which scales the bar widget's proportions by the dock height.
- `DockWindow.qml` gives Spaces a stand-in for the bar facade that bar widgets normally get (`/usr/share/omarchy/shell/Ui/PluginBarApi.qml`). Any new `bar.*` member that Spaces uses must be added there.

## Develop

```bash
node tests/model.test.js
node --test tests/sysmetrics.test.js
bash tests/discovery.test.sh
omarchy plugin validate "$PWD"
omarchy restart shell
journalctl --user -t omarchy-shell -f
hyprctl layers | grep -A0 spaces-dock
```

## Credits

Spaces by [Tornike Gomareli](https://github.com/tornikegomareli/omarchy-spaces), MIT. Spaces Dock keeps that license, see `LICENSE`.

The system panel is the System Monitor plugin by [Harshith Chennupati](https://github.com/Harshith292002/omarchy-system-monitor), MIT, forked into the dock: `SystemPanel.qml`, `SysMetrics.qml`, `SysMetrics.js`, `Sparkline.qml`, `discover-sensors.sh` and their tests. Its notice is in `LICENSE`.

The stat pills follow the approach of the Konostat plugin by konochi, and the player follows the Media Controls + Album Art plugin by crmne. Spaces Dock has its own implementation of both and does not need any of these plugins installed.
