.pragma library

// Pure helpers for Spaces Dock (a bottom-of-screen fork of the Spaces bar
// widget by Tornike Gomareli). Nothing here touches QML objects beyond plain
// property reads, so the logic can be exercised with node (see
// tests/model.test.js).

var PLUGIN_ID = "io.github.baranskyi.spaces-dock"

var DEFAULTS = {
  // Dock surface
  dockHeight: 56,             // height of the dock surface, logical px
  bottomMargin: 0,            // gap between the dock and the screen edge
  reserveSpace: true,         // push windows up (exclusive zone) or float over them
  alignment: "center",        // "center" (pill sized to content) | "full" (edge to edge)
  monitors: "all",            // "all" | "primary" | an output name such as "HDMI-A-1"
  hideWithBar: true,          // hide the dock while the main bar is toggled off

  // Player island, left of the dock
  showPlayer: true,
  playerSource: "spotify",    // "spotify" | "any" (any MPRIS player)
  playerControls: true,      // previous / play-pause / next buttons

  // System stats island, right of the dock
  showStats: true,
  statCpu: true,
  statMemory: true,
  statTemperature: true,
  statGpu: false,
  statStorage: false,
  statNetwork: false,
  statFans: false,

  showIcons: true,            // master switch: app icons visible or hidden
  showApps: "hover",          // "all" | "active" | "hover" (active + hovered) | "hoverOnly"
  persistentWorkspaces: 5,    // workspaces 1..N are always shown
  hideEmpty: false,           // hide empty workspaces, even persistent ones
  perMonitor: false,          // only list workspaces on this dock's monitor
  iconSize: 28,
  maxIcons: 8,                // overflow collapses into a "+N" chip
  groupApps: false,           // one icon per app, with a window count
  dimUnfocused: true,         // dim other windows on the active workspace
  focusedTitle: false,        // show the focused window's title next to its icon
  titleLength: 24,
  activeStyle: "subtle",      // "subtle" | "solid" | "accent"
  labelStyle: "number",       // "number" | "glyph" | "none"
  animations: true,
  animationSpeed: "normal",   // "slow" | "normal" | "fast"
  scrollSwitch: true,
  iconStyle: "color",         // "color" | "mono"
  urgentHighlight: true,      // pulse workspaces whose windows ask for attention
  middleClickClose: false,    // middle-click an icon closes that window
  tooltips: true,
  density: "normal",          // "compact" | "normal" | "roomy"
  activeClick: "none",        // clicking the active pill: "none" | "previous"
  settingsButton: "hover",    // gear button: "hover" | "always" | "never"
  previews: true,             // live preview of a workspace on hover
  previewSize: "medium",      // "small" | "medium" | "large"
  previewLive: true,          // keep previews streaming; false = one frame
  agentStatus: true           // badges for coding agents running in terminals
}

var SHOW_APPS = ["all", "active", "hover", "hoverOnly"]
var ICON_STYLES = ["color", "mono"]
var DENSITIES = ["compact", "normal", "roomy"]
var ACTIVE_CLICKS = ["none", "previous"]
var SETTINGS_BUTTONS = ["hover", "always", "never"]
var PREVIEW_SIZES = ["small", "medium", "large"]
var ACTIVE_STYLES = ["subtle", "solid", "accent"]
var LABEL_STYLES = ["number", "glyph", "none"]
var SPEEDS = ["slow", "normal", "fast"]
var ALIGNMENTS = ["center", "full"]
var PLAYER_SOURCES = ["spotify", "any"]

var DOCK_HEIGHT_MIN = 40
var DOCK_HEIGHT_MAX = 96
var ICON_SIZE_MIN = 12
var ICON_SIZE_MAX = 64
var BOTTOM_MARGIN_MAX = 64

function clampInt(value, min, max, fallback) {
  var n = Math.round(Number(value))
  if (!isFinite(n)) return fallback
  return Math.max(min, Math.min(max, n))
}

function oneOf(value, allowed, fallback) {
  return allowed.indexOf(String(value)) !== -1 ? String(value) : fallback
}

function bool(value, fallback) {
  return typeof value === "boolean" ? value : fallback
}

// Normalizes a raw shell.json entry into a complete, valid settings object.
function resolveSettings(raw) {
  var s = raw || {}
  var d = DEFAULTS
  return {
    dockHeight: clampInt(s.dockHeight, DOCK_HEIGHT_MIN, DOCK_HEIGHT_MAX, d.dockHeight),
    bottomMargin: clampInt(s.bottomMargin, 0, BOTTOM_MARGIN_MAX, d.bottomMargin),
    reserveSpace: bool(s.reserveSpace, d.reserveSpace),
    alignment: oneOf(s.alignment, ALIGNMENTS, d.alignment),
    monitors: typeof s.monitors === "string" && s.monitors.trim() !== "" ? s.monitors.trim() : d.monitors,
    hideWithBar: bool(s.hideWithBar, d.hideWithBar),
    showPlayer: bool(s.showPlayer, d.showPlayer),
    playerSource: oneOf(s.playerSource, PLAYER_SOURCES, d.playerSource),
    playerControls: bool(s.playerControls, d.playerControls),
    showStats: bool(s.showStats, d.showStats),
    statCpu: bool(s.statCpu, d.statCpu),
    statMemory: bool(s.statMemory, d.statMemory),
    statTemperature: bool(s.statTemperature, d.statTemperature),
    statGpu: bool(s.statGpu, d.statGpu),
    statStorage: bool(s.statStorage, d.statStorage),
    statNetwork: bool(s.statNetwork, d.statNetwork),
    statFans: bool(s.statFans, d.statFans),
    showIcons: bool(s.showIcons, d.showIcons),
    showApps: oneOf(s.showApps, SHOW_APPS, d.showApps),
    persistentWorkspaces: clampInt(s.persistentWorkspaces, 0, 10, d.persistentWorkspaces),
    hideEmpty: bool(s.hideEmpty, d.hideEmpty),
    perMonitor: bool(s.perMonitor, d.perMonitor),
    iconSize: clampInt(s.iconSize, ICON_SIZE_MIN, ICON_SIZE_MAX, d.iconSize),
    maxIcons: clampInt(s.maxIcons, 1, 20, d.maxIcons),
    groupApps: bool(s.groupApps, d.groupApps),
    dimUnfocused: bool(s.dimUnfocused, d.dimUnfocused),
    focusedTitle: bool(s.focusedTitle, d.focusedTitle),
    titleLength: clampInt(s.titleLength, 8, 60, d.titleLength),
    activeStyle: oneOf(s.activeStyle, ACTIVE_STYLES, d.activeStyle),
    labelStyle: oneOf(s.labelStyle, LABEL_STYLES, d.labelStyle),
    animations: bool(s.animations, d.animations),
    animationSpeed: oneOf(s.animationSpeed, SPEEDS, d.animationSpeed),
    scrollSwitch: bool(s.scrollSwitch, d.scrollSwitch),
    iconStyle: oneOf(s.iconStyle, ICON_STYLES, d.iconStyle),
    urgentHighlight: bool(s.urgentHighlight, d.urgentHighlight),
    middleClickClose: bool(s.middleClickClose, d.middleClickClose),
    tooltips: bool(s.tooltips, d.tooltips),
    density: oneOf(s.density, DENSITIES, d.density),
    activeClick: oneOf(s.activeClick, ACTIVE_CLICKS, d.activeClick),
    settingsButton: oneOf(s.settingsButton, SETTINGS_BUTTONS, d.settingsButton),
    previews: bool(s.previews, d.previews),
    previewSize: oneOf(s.previewSize, PREVIEW_SIZES, d.previewSize),
    previewLive: bool(s.previewLive, d.previewLive),
    agentStatus: bool(s.agentStatus, d.agentStatus)
  }
}

function durationFor(settings, base) {
  if (!settings.animations) return 0
  var factor = settings.animationSpeed === "slow" ? 1.6 : (settings.animationSpeed === "fast" ? 0.55 : 1)
  return Math.round(base * factor)
}

// Whether a workspace pill should reveal its app icons.
function showsApps(settings, occupied, active, hovered) {
  if (!settings.showIcons || !occupied) return false
  switch (settings.showApps) {
  case "all": return true
  case "active": return active
  case "hoverOnly": return hovered
  default: return active || hovered
  }
}

// Spacing between pills and inside them, in unscaled px.
function densityMetrics(density) {
  if (density === "compact") return { gap: 2, pad: 5, iconGap: 1 }
  if (density === "roomy") return { gap: 7, pad: 10, iconGap: 5 }
  return { gap: 4, pad: 7, iconGap: 3 }
}

// Pixel metrics for the dock, derived from its height. The bar widget took
// these from the bar's thickness; the dock scales them with its own height so
// every size stays proportional. `scale` is Style.effectiveSpacingScale.
function dockMetrics(settings, scale) {
  var sc = scale > 0 ? scale : 1
  var height = clampInt(settings.dockHeight, DOCK_HEIGHT_MIN, DOCK_HEIGHT_MAX, DEFAULTS.dockHeight)
  var pill = Math.max(24, height - Math.round(8 * sc))
  var icon = Math.max(ICON_SIZE_MIN, Math.min(settings.iconSize || DEFAULTS.iconSize, pill - Math.round(6 * sc)))
  // The bar widget's pill is 20 unscaled px on a default bar; spacing grows
  // by the same factor the pill does, so the dock keeps Spaces' proportions.
  var k = Math.max(1, Math.min(3, pill / (20 * sc)))
  var d = densityMetrics(settings.density)
  var label = Math.max(Math.round(12 * sc), Math.min(28, Math.round(pill * 0.42)))
  return {
    pillThickness: pill,
    iconPx: icon,
    pillRadius: Math.round(pill * 0.32),
    gap: Math.round(d.gap * k * sc),
    pad: Math.round(d.pad * k * sc),
    iconGap: Math.round(d.iconGap * k * sc),
    labelPx: label,
    k: k
  }
}

// Name of the "primary" output: the Hyprland monitor with the lowest id.
//   monitors: [{ name, id }]
function primaryScreenName(monitors) {
  var best = null
  for (var i = 0; i < (monitors || []).length; i++) {
    var m = monitors[i]
    if (!m || !m.name) continue
    if (best === null || Number(m.id) < Number(best.id)) best = m
  }
  return best ? String(best.name) : ""
}

// Whether the dock shows on the output called `name`. A named output that is
// not connected (`available` lists the connected ones) falls back to "all",
// so unplugging the chosen monitor never leaves you without a dock.
function screenSelected(setting, name, primaryName, available) {
  if (!setting || setting === "all") return true
  if (setting === "primary") return !primaryName || name === primaryName
  if (available && available.indexOf(setting) === -1) return true
  return name === setting
}

// Finds this plugin's entry in the raw shell.json text. Returns null when the
// file cannot be parsed or the plugin has no top-level entry.
function pluginEntry(rawJson, id) {
  var config
  try { config = JSON.parse(String(rawJson || "")) } catch (e) { return null }
  if (!config || typeof config !== "object" || !Array.isArray(config.plugins)) return null
  for (var i = 0; i < config.plugins.length; i++) {
    var entry = config.plugins[i]
    if (entry && typeof entry === "object" && entry.id === id) return entry
  }
  return null
}

// ------------------------------------------------------------ player

function isSpotifyPlayer(identity, desktopEntry, dbusName) {
  return /spotify/i.test(String(identity || "") + " " + String(desktopEntry || "") + " " + String(dbusName || ""))
}

function isProxyPlayer(dbusName, desktopEntry) {
  return /playerctld/i.test(String(dbusName || "") + " " + String(desktopEntry || ""))
}

// Picks the player the island shows. `players`: [{ key, spotify, proxy,
// playing, stopped, hasTrack }] in Mpris order. "spotify" shows Spotify only;
// "any" prefers whatever is playing, then the last player you controlled.
// Returns an index into `players`, or -1.
function pickPlayer(players, source, preferredKey) {
  var list = players || []
  var usable = []
  for (var i = 0; i < list.length; i++) {
    var p = list[i]
    if (!p || p.stopped || !p.hasTrack) continue
    if (source === "spotify" && !p.spotify) continue
    usable.push(i)
  }
  function find(test) {
    for (var j = 0; j < usable.length; j++) if (test(list[usable[j]])) return usable[j]
    return -1
  }
  var preferred = preferredKey ? find(function(p) { return p.key === preferredKey }) : -1
  if (preferred !== -1 && list[preferred].playing) return preferred
  var order = [
    function(p) { return p.playing && !p.proxy },
    function(p) { return p.playing && p.proxy }
  ]
  for (var o = 0; o < order.length; o++) {
    var hit = find(order[o])
    if (hit !== -1) return hit
  }
  if (preferred !== -1) return preferred
  var paused = find(function(p) { return !p.proxy })
  return paused !== -1 ? paused : find(function() { return true })
}

// ------------------------------------------------------------ system stats

// Order on the island. Icons are the Material Design Nerd Font glyphs
// Konostat uses, so both read the same.
var STATS = [
  { key: "cpu", setting: "statCpu", label: "CPU", icon: 0xf0ee0, template: "100%" },
  { key: "gpu", setting: "statGpu", label: "GPU", icon: 0xf08ae, template: "9999 MHz" },
  { key: "memory", setting: "statMemory", label: "Memory", icon: 0xf035b, template: "100%" },
  { key: "storage", setting: "statStorage", label: "Storage", icon: 0xf02ca, template: "100%" },
  { key: "network", setting: "statNetwork", label: "Network", icon: 0xf05a9, template: "↓999K ↑999K" },
  { key: "fans", setting: "statFans", label: "Fans", icon: 0xf0210, template: "9999 RPM" },
  { key: "temperature", setting: "statTemperature", label: "Temperature", icon: 0xf050f, template: "100°C" }
]

// Enabled stats, in island order: [{ key, label, icon (string), template }].
function enabledStats(settings) {
  var out = []
  if (!settings || !settings.showStats) return out
  for (var i = 0; i < STATS.length; i++) {
    var m = STATS[i]
    if (settings[m.setting] === true)
      out.push({ key: m.key, label: m.label, icon: String.fromCodePoint(m.icon), template: m.template })
  }
  return out
}

// Value for stats.py --metrics; "" when the island is off.
function statsMetricsArg(settings) {
  return enabledStats(settings).map(function(m) { return m.key }).join(",")
}

function isNum(v) { return typeof v === "number" && isFinite(v) }

function formatPercent(v) { return isNum(v) ? Math.round(v) + "%" : "N/A" }

function formatBytes(v) {
  if (!isNum(v)) return "N/A"
  var units = ["B", "KiB", "MiB", "GiB", "TiB"]
  var i = 0
  while (Math.abs(v) >= 1024 && i < units.length - 1) { v /= 1024; i++ }
  return (i === 0 ? Math.round(v) : v.toFixed(1)) + " " + units[i]
}

// Short per-second rate for the island: 0, 950, 12K, 1.2M.
function formatRate(v) {
  if (!isNum(v)) return "N/A"
  var units = ["", "K", "M", "G"]
  var i = 0
  while (v >= 1000 && i < units.length - 1) { v /= 1024; i++ }
  if (i === 0) return String(Math.round(v))
  return (v < 10 ? v.toFixed(1) : String(Math.round(v))) + units[i]
}

// The GPU shown on the island: one with a utilization reading, else one with
// a clock, else the first one.
function primaryGpu(gpus) {
  var list = gpus || []
  for (var i = 0; i < list.length; i++) if (isNum(list[i].percent)) return list[i]
  for (var j = 0; j < list.length; j++) if (isNum(list[j].frequencyMHz)) return list[j]
  return list.length ? list[0] : null
}

function maxValue(rows) {
  var best = null
  for (var i = 0; i < (rows || []).length; i++)
    if (isNum(rows[i].value) && (best === null || rows[i].value > best)) best = rows[i].value
  return best
}

// Text on a stat pill. "—" until the collector has reported that metric.
function statText(key, state) {
  var s = state || {}
  if (s[key] === undefined) return "—"
  switch (key) {
  case "cpu": return formatPercent(s.cpu.percent)
  case "memory": return formatPercent(s.memory.percent)
  case "temperature": return isNum(s.temperature.cpu) ? Math.round(s.temperature.cpu) + "°C" : "N/A"
  case "gpu":
    var g = primaryGpu(s.gpu)
    if (!g) return "N/A"
    if (isNum(g.percent)) return formatPercent(g.percent)
    return isNum(g.frequencyMHz) ? Math.round(g.frequencyMHz) + " MHz" : "N/A"
  case "storage": return s.storage.length ? formatPercent(s.storage[0].percent) : "N/A"
  case "network": return "↓" + formatRate(s.network.download) + " ↑" + formatRate(s.network.upload)
  case "fans":
    var rpm = maxValue(s.fans)
    return rpm === null ? "N/A" : Math.round(rpm) + " RPM"
  }
  return "—"
}

// Load levels for colouring stat pills. Same thresholds as the System
// Monitor panel: usage turns yellow at 80% and red at 95%, temperatures at
// 85°C and 95°C. Network and fans have no level.
var LEVEL_USAGE = { warning: 80, critical: 95 }
var LEVEL_TEMPERATURE = { warning: 85, critical: 95 }
var LEVEL_RANK = { normal: 0, warning: 1, critical: 2 }

function levelFor(value, limits) {
  if (!isNum(value)) return "normal"
  if (value >= limits.critical) return "critical"
  if (value >= limits.warning) return "warning"
  return "normal"
}

function worseLevel(a, b) {
  return LEVEL_RANK[b] > LEVEL_RANK[a] ? b : a
}

// "normal" | "warning" | "critical" for a stat pill.
function statLevel(key, state) {
  var s = state || {}
  if (s[key] === undefined) return "normal"
  switch (key) {
  case "cpu": return levelFor(s.cpu.percent, LEVEL_USAGE)
  case "memory": return levelFor(s.memory.percent, LEVEL_USAGE)
  case "storage": return s.storage.length ? levelFor(s.storage[0].percent, LEVEL_USAGE) : "normal"
  case "temperature": return levelFor(s.temperature.cpu, LEVEL_TEMPERATURE)
  case "gpu":
    var level = "normal"
    for (var i = 0; i < (s.gpu || []).length; i++) {
      var g = s.gpu[i]
      level = worseLevel(level, levelFor(g.percent, LEVEL_USAGE))
      level = worseLevel(level, levelFor(g.temperature, LEVEL_TEMPERATURE))
    }
    return level
  }
  return "normal"
}

// Temperatures grouped by part, e.g. "CPU 64°C · SSD 40–45°C".
function temperatureSummary(sensors) {
  var groups = {}
  var order = []
  for (var i = 0; i < (sensors || []).length; i++) {
    var sensor = sensors[i]
    var chip = String(sensor.chip || "")
    var label = /^(coretemp|k10temp|zenpower|cpu)/i.test(chip) ? "CPU"
      : /^nvme/i.test(chip) ? "SSD"
      : /^(spd|dimm)/i.test(chip) ? "Memory"
      : /^(iwl|ath|wifi|mt7)/i.test(chip) ? "Wi-Fi"
      : /^(acpi|thinkpad)/i.test(chip) ? "System"
      : /^(amdgpu|i915|xe|nouveau)$/i.test(chip) ? "GPU" : chip
    var v = Math.round(sensor.value)
    if (!groups[label]) { groups[label] = { min: v, max: v }; order.push(label) }
    else { groups[label].min = Math.min(groups[label].min, v); groups[label].max = Math.max(groups[label].max, v) }
  }
  return order.map(function(label) {
    var g = groups[label]
    return label + " " + (g.min === g.max ? g.max : g.min + "–" + g.max) + "°C"
  }).join(" · ")
}

// Tooltip text for a stat pill.
function statDetail(key, state) {
  var s = state || {}
  if (s[key] === undefined) return "Reading system information…"
  switch (key) {
  case "cpu":
    return s.cpu.name + "\n" + s.cpu.threads + " threads · Load " + (s.cpu.load || []).map(function(v) { return Number(v).toFixed(2) }).join(" / ")
  case "memory":
    return "Memory " + formatBytes(s.memory.used) + " / " + formatBytes(s.memory.total)
      + "\nSwap " + formatBytes(s.memory.swapUsed) + " / " + formatBytes(s.memory.swapTotal)
  case "temperature":
    return temperatureSummary(s.temperature.sensors) || "No readable temperature sensors"
  case "gpu":
    return (s.gpu || []).map(function(g) {
      if (g.asleep) return g.name + " · asleep"
      var parts = [g.name]
      if (isNum(g.percent)) parts.push(formatPercent(g.percent))
      if (isNum(g.frequencyMHz)) parts.push(Math.round(g.frequencyMHz) + " MHz")
      if (isNum(g.temperature)) parts.push(Math.round(g.temperature) + "°C")
      if (isNum(g.memoryTotal) && g.memoryTotal > 0) parts.push("VRAM " + formatBytes(g.memoryUsed) + " / " + formatBytes(g.memoryTotal))
      return parts.join(" · ")
    }).join("\n") || "No GPU detected"
  case "storage":
    return (s.storage || []).map(function(d) {
      return d.mount + " · " + formatBytes(d.used) + " / " + formatBytes(d.total) + " · " + formatBytes(d.free) + " free"
    }).join("\n") || "No local disks detected"
  case "network":
    return (s.network.interfaces || []).map(function(n) {
      return n.name + " · ↓" + formatBytes(n.download) + "/s ↑" + formatBytes(n.upload) + "/s"
    }).join("\n") || "No connected network interfaces"
  case "fans":
    return (s.fans || []).map(function(f) { return f.name + " · " + Math.round(f.value) + " RPM" }).join("\n") || "No readable fan sensors"
  }
  return ""
}

// Hyprland reports addresses with or without the 0x prefix depending on source.
function normalizeAddress(address) {
  return String(address || "").toLowerCase().replace(/^0x/, "")
}

// Workspace ids to render. `occupied` maps id -> window count for every
// normal (positive id) workspace Hyprland knows about. `activeIds` are
// workspaces that must stay visible even when empty (focused / on-screen).
function workspaceIds(occupied, activeIds, persistent, hideEmpty) {
  var ids = []
  function add(id) {
    if (id > 0 && ids.indexOf(id) === -1) ids.push(id)
  }

  if (!hideEmpty) for (var p = 1; p <= persistent; p++) add(p)
  for (var key in occupied) {
    var id = Number(key)
    if (occupied[key] > 0 || !hideEmpty) add(id)
  }
  for (var a = 0; a < activeIds.length; a++) add(activeIds[a])

  ids.sort(function(l, r) { return l - r })
  return ids
}

// Label text for a workspace pill.
function workspaceLabel(id, focused, style) {
  if (style === "none") return ""
  if (style === "glyph" && focused) return "󱓻"
  return id === 10 ? "0" : String(id)
}

// Stable key identifying "the same app" across windows.
function appKey(appId) {
  return String(appId || "").toLowerCase()
}

// Orders windows the way they sit on screen: left to right, then top to
// bottom. Windows without a known position keep their relative order.
function sortWindows(windows) {
  var indexed = windows.map(function(w, i) { return { w: w, i: i } })
  indexed.sort(function(l, r) {
    var la = l.w.at, ra = r.w.at
    if (la && ra) {
      if (la[0] !== ra[0]) return la[0] - ra[0]
      if (la[1] !== ra[1]) return la[1] - ra[1]
    } else if (la && !ra) {
      return -1
    } else if (!la && ra) {
      return 1
    }
    return l.i - r.i
  })
  return indexed.map(function(x) { return x.w })
}

// Turns a sorted window list into render items.
//   windows: [{ address, appId, title, focused }]
// Returns { items: [{ key, address, appId, title, focused, count }], overflow }
function iconItems(windows, groupApps, maxIcons) {
  var items = []
  if (groupApps) {
    var byApp = {}
    for (var i = 0; i < windows.length; i++) {
      var w = windows[i]
      var k = appKey(w.appId) || w.address
      var existing = byApp[k]
      if (!existing) {
        existing = { key: k, address: w.address, appId: w.appId, title: w.title, focused: w.focused, count: 1, addresses: [w.address] }
        byApp[k] = existing
        items.push(existing)
      } else {
        existing.count++
        existing.addresses.push(w.address)
        if (w.focused) {
          existing.focused = true
          existing.address = w.address
          existing.title = w.title
        }
      }
    }
  } else {
    for (var j = 0; j < windows.length; j++) {
      var x = windows[j]
      items.push({ key: x.address, address: x.address, appId: x.appId, title: x.title, focused: x.focused, count: 1, addresses: [x.address] })
    }
  }

  var overflow = Math.max(0, items.length - maxIcons)
  if (overflow > 0) {
    // Never hide the focused window behind the overflow chip.
    var visible = items.slice(0, maxIcons)
    var focusedIdx = -1
    for (var f = maxIcons; f < items.length; f++) if (items[f].focused) focusedIdx = f
    if (focusedIdx !== -1) visible[visible.length - 1] = items[focusedIdx]
    items = visible
  }
  return { items: items, overflow: overflow }
}

function truncate(text, max) {
  var t = String(text || "")
  return t.length > max ? t.slice(0, Math.max(1, max - 1)) + "…" : t
}

// Title shown next to the focused icon. The app name when
// the app has a single window in the workspace, else the window title.
function focusedLabel(item, appName, maxLength) {
  if (!item || !item.focused) return ""
  var text = item.count > 1 || !appName ? item.title : appName
  return truncate(text, maxLength)
}

// Lookup keys for an app id, most specific first. Reverse-DNS ids such as
// "dev.example.my-tool" often ship a desktop file named after the last part.
function appIdCandidates(appId) {
  var id = String(appId || "")
  if (id === "") return []
  var out = [id]
  function add(v) { if (v && out.indexOf(v) === -1) out.push(v) }
  add(id.toLowerCase())
  var dot = id.lastIndexOf(".")
  if (dot > 0 && dot < id.length - 1) {
    add(id.slice(dot + 1))
    add(id.slice(dot + 1).toLowerCase())
  }
  return out
}

// Chromium-family --app windows use classes like
// "chrome-web.whatsapp.com__-Default" or "brave-app.hey.com__-Profile_1".
// Returns the host ("web.whatsapp.com") or "" when the class is not one.
function webAppHost(appId) {
  var m = /^(?:chrome|chromium|brave|msedge|vivaldi|helium|opera)-([^_]+?)(?:__|_).*-(?:Default|Profile_\d+)$/i.exec(String(appId || ""))
  return m ? m[1] : ""
}

// Icon candidates scanned from disk: prefer scalable, then the largest raster.
function iconPathScore(path) {
  var p = String(path || "")
  if (/\.svg$/i.test(p)) return 100000
  var m = /\/(\d+)x\d+\//.exec(p)
  if (m) return Number(m[1])
  return /\/pixmaps\//.test(p) ? 48 : 1
}

function iconNameFromPath(path) {
  var value = String(path || "")
  var slash = value.lastIndexOf("/")
  var file = slash >= 0 ? value.slice(slash + 1) : value
  var dot = file.lastIndexOf(".")
  return dot > 0 ? file.slice(0, dot) : file
}

// Width of the workspace miniature, in unscaled px.
function previewWidth(size) {
  if (size === "small") return 260
  if (size === "large") return 520
  return 380
}

// Usable area of a monitor in logical layout coordinates, i.e. without the
// space reserved by bars. `monitor`: { x, y, width, height, scale, reserved }
// where width/height are physical pixels and reserved is [l, t, r, b].
function monitorArea(monitor) {
  if (!monitor || !monitor.width || !monitor.height) return null
  var scale = monitor.scale > 0 ? monitor.scale : 1
  var r = monitor.reserved && monitor.reserved.length === 4 ? monitor.reserved : [0, 0, 0, 0]
  var w = monitor.width / scale
  var h = monitor.height / scale
  return {
    x: (monitor.x || 0) + r[0],
    y: (monitor.y || 0) + r[1],
    width: Math.max(1, w - r[0] - r[2]),
    height: Math.max(1, h - r[1] - r[3])
  }
}

// Places windows inside a width x height miniature of `area`, where they
// really are on screen. Floating windows come last so they draw on top.
// Windows without a known position are laid out in an even grid instead.
//   windows: [{ address, at: [x, y] | null, size: [w, h] | null, floating }]
function previewLayout(windows, area, width, height) {
  var placed = []
  var known = area && windows.length > 0 && windows.every(function(w) { return w.at && w.size })

  if (known) {
    var sx = width / area.width
    var sy = height / area.height
    for (var i = 0; i < windows.length; i++) {
      var w = windows[i]
      var x = (w.at[0] - area.x) * sx
      var y = (w.at[1] - area.y) * sy
      var ww = w.size[0] * sx
      var hh = w.size[1] * sy
      // Clamp into the miniature; windows can hang off the edge.
      var cx = Math.max(0, Math.min(width - 4, x))
      var cy = Math.max(0, Math.min(height - 4, y))
      placed.push({
        address: w.address,
        x: cx, y: cy,
        width: Math.max(4, Math.min(width - cx, ww - (cx - x))),
        height: Math.max(4, Math.min(height - cy, hh - (cy - y))),
        floating: !!w.floating
      })
    }
  } else {
    var n = windows.length
    var cols = Math.max(1, Math.ceil(Math.sqrt(n)))
    var rows = Math.max(1, Math.ceil(n / cols))
    var gap = 4
    var cw = (width - gap * (cols - 1)) / cols
    var ch = (height - gap * (rows - 1)) / rows
    for (var j = 0; j < n; j++) {
      placed.push({
        address: windows[j].address,
        x: (j % cols) * (cw + gap), y: Math.floor(j / cols) * (ch + gap),
        width: cw, height: ch,
        floating: false
      })
    }
  }

  placed.sort(function(l, r) { return (l.floating ? 1 : 0) - (r.floating ? 1 : 0) })
  return placed
}

// Maps window PIDs to agent states. `agents`: { session: { state, pids } }
// where pids run from the agent up to init. The nearest ancestor that is a
// window owns the agent, since terminals can be nested in other terminals.
// When several agents share a window, "waiting" beats "working" beats "done".
var AGENT_RANK = { waiting: 3, working: 2, done: 1 }

function agentStates(agents, windowPids) {
  var out = {}
  for (var session in agents) {
    var agent = agents[session]
    var rank = AGENT_RANK[agent.state] || 0
    if (!rank) continue
    for (var i = 0; i < agent.pids.length; i++) {
      var pid = agent.pids[i]
      if (!windowPids[pid]) continue
      if (!out[pid] || AGENT_RANK[out[pid]] < rank) out[pid] = agent.state
      break
    }
  }
  return out
}

function parsePids(csv) {
  return String(csv || "").split(",").map(function(v) { return Number(v) }).filter(function(n) { return n > 1 })
}

// Next workspace id when scrolling; wraps around.
function stepWorkspace(ids, current, delta) {
  if (!ids.length) return current
  var idx = ids.indexOf(current)
  if (idx === -1) return ids[0]
  var next = (idx + (delta > 0 ? 1 : -1) + ids.length) % ids.length
  return ids[next]
}

// Merges a settings delta into an entry for shell.json.
function mergedEntry(moduleName, current, delta) {
  var entry = { id: moduleName }
  for (var k in current) if (k !== "id") entry[k] = current[k]
  for (var d in delta) entry[d] = delta[d]
  return entry
}

// node / CommonJS export for tests; ignored by QML.
if (typeof module !== "undefined") {
  module.exports = {
    PLUGIN_ID: PLUGIN_ID, DEFAULTS: DEFAULTS, resolveSettings: resolveSettings, showsApps: showsApps,
    dockMetrics: dockMetrics, primaryScreenName: primaryScreenName, screenSelected: screenSelected,
    pluginEntry: pluginEntry,
    isSpotifyPlayer: isSpotifyPlayer, isProxyPlayer: isProxyPlayer, pickPlayer: pickPlayer,
    STATS: STATS, enabledStats: enabledStats, statsMetricsArg: statsMetricsArg,
    formatPercent: formatPercent, formatBytes: formatBytes, formatRate: formatRate,
    primaryGpu: primaryGpu, statText: statText, statDetail: statDetail, temperatureSummary: temperatureSummary,
    statLevel: statLevel, LEVEL_USAGE: LEVEL_USAGE, LEVEL_TEMPERATURE: LEVEL_TEMPERATURE,
    densityMetrics: densityMetrics, normalizeAddress: normalizeAddress,
    agentStates: agentStates, parsePids: parsePids,
    previewWidth: previewWidth, monitorArea: monitorArea, previewLayout: previewLayout, durationFor: durationFor,
    workspaceIds: workspaceIds, workspaceLabel: workspaceLabel, appKey: appKey,
    sortWindows: sortWindows, iconItems: iconItems, truncate: truncate,
    focusedLabel: focusedLabel, webAppHost: webAppHost, appIdCandidates: appIdCandidates, iconPathScore: iconPathScore,
    iconNameFromPath: iconNameFromPath, stepWorkspace: stepWorkspace, mergedEntry: mergedEntry
  }
}
