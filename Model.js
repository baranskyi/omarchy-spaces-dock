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
  statsStyle: "rings",       // "rings" (icon in a filling ring) | "values" (icon and number)
  statCpu: true,
  statMemory: true,
  statTemperature: true,
  statGpu: false,
  statStorage: false,
  statNetwork: false,
  statFans: false,
  statBattery: true,          // hidden on computers without a battery

  // Controls island: volume and brightness rings, keyboard layout emblem
  showVolume: true,
  showBrightness: true,       // per monitor; hidden where it cannot be read
  showLanguage: true,         // only with more than one keyboard layout

  // Stay Awake pill. The mode it turns on: "screens-on" (nothing idles) or
  // "screens-off" (screens go dark, nothing locks or sleeps). Turning it on or
  // off is Omarchy's own stay-awake flag.
  showAwake: true,
  stayAwakeMode: "screens-on",

  // Left-to-right order of the pills. "spaces" (the workspace pill) always
  // stays centered; the others sit beside it and can be dragged around.
  islandOrder: ["quickfile", "player", "spaces", "limits", "stats", "controls", "awake"],

  // QuickFile button pill: opens the QuickFile plugin, or offers to install it
  showQuickfile: true,

  // AI subscription limits island, between the dock and the system stats
  showLimits: true,
  limitClaude: true,
  limitCodex: true,
  limitGrok: true,
  limitGrokRefresh: false,   // opt-in: renew the Grok CLI token in ~/.grok/auth.json

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
var STATS_STYLES = ["rings", "values"]

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
    statsStyle: oneOf(s.statsStyle, STATS_STYLES, d.statsStyle),
    statCpu: bool(s.statCpu, d.statCpu),
    statMemory: bool(s.statMemory, d.statMemory),
    statTemperature: bool(s.statTemperature, d.statTemperature),
    statGpu: bool(s.statGpu, d.statGpu),
    statStorage: bool(s.statStorage, d.statStorage),
    statNetwork: bool(s.statNetwork, d.statNetwork),
    statFans: bool(s.statFans, d.statFans),
    statBattery: bool(s.statBattery, d.statBattery),
    showVolume: bool(s.showVolume, d.showVolume),
    showBrightness: bool(s.showBrightness, d.showBrightness),
    showLanguage: bool(s.showLanguage, d.showLanguage),
    showAwake: bool(s.showAwake, d.showAwake),
    stayAwakeMode: oneOf(s.stayAwakeMode, STAY_AWAKE_MODES, d.stayAwakeMode),
    islandOrder: normalizeIslandOrder(s.islandOrder),
    showQuickfile: bool(s.showQuickfile, d.showQuickfile),
    showLimits: bool(s.showLimits, d.showLimits),
    limitClaude: bool(s.limitClaude, d.limitClaude),
    limitCodex: bool(s.limitCodex, d.limitCodex),
    limitGrok: bool(s.limitGrok, d.limitGrok),
    limitGrokRefresh: bool(s.limitGrokRefresh, d.limitGrokRefresh),
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
// Spotify counts from the moment it runs, track or not; other players only
// while they have a track loaded, so an idle browser never takes the island.
// Returns an index into `players`, or -1.
function pickPlayer(players, source, preferredKey) {
  var list = players || []
  var usable = []
  for (var i = 0; i < list.length; i++) {
    var p = list[i]
    if (!p) continue
    if (source === "spotify" && !p.spotify) continue
    if (!p.spotify && (p.stopped || !p.hasTrack)) continue
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
  { key: "temperature", setting: "statTemperature", label: "Temperature", icon: 0xf050f, template: "100°C" },
  { key: "battery", setting: "statBattery", label: "Battery", icon: 0xf0079, template: "100%" }
]

var BATTERY_CHARGING_ICON = 0xf0084

// Whether a stat has anything to show on this machine. Only the battery can
// be missing: a desktop has none, and its ring stays hidden.
function statAvailable(key, state) {
  if (key !== "battery") return true
  var b = (state || {}).battery
  return !!(b && b.present)
}

// Glyph for a stat; the battery shows a charging bolt while plugged in.
function statGlyph(key, state, fallback) {
  if (key === "battery") {
    var b = (state || {}).battery
    if (b && b.present && (b.status === "Charging" || b.plugged)) return String.fromCodePoint(BATTERY_CHARGING_ICON)
  }
  return fallback
}

// "2h 31m", "45m"; "" without a value.
function formatMinutes(minutes) {
  if (!isNum(minutes) || minutes < 0) return ""
  var h = Math.floor(minutes / 60)
  var m = Math.round(minutes % 60)
  return h > 0 ? h + "h " + m + "m" : m + "m"
}

// ------------------------------------------------------------ stay awake

var STAY_AWAKE_MODES = ["screens-on", "screens-off"]

// Picker options, top to bottom.
var AWAKE_OPTIONS = [
  { key: "screens-on", label: "Screens on", icon: 0xf0176 },
  { key: "screens-off", label: "Screens off", icon: 0xf0d90 },
  { key: "normal", label: "Normal", icon: 0xf0904 }
]

function awakeOptions() {
  return AWAKE_OPTIONS.map(function(o) { return { key: o.key, label: o.label, icon: String.fromCodePoint(o.icon) } })
}

// "normal" while Omarchy's stay-awake flag is off, else the chosen mode.
function awakeMode(stayAwake, setting) {
  if (!stayAwake) return "normal"
  return setting === "screens-off" ? "screens-off" : "screens-on"
}

// The pill's glyph: a cup while nothing idles, a dark monitor while screens
// may go off, an empty cup when Stay Awake is off.
function awakeGlyph(mode) {
  if (mode === "screens-on") return String.fromCodePoint(0xf0176)
  if (mode === "screens-off") return String.fromCodePoint(0xf0d90)
  return String.fromCodePoint(0xf06ca)
}

// Omarchy's idle timeouts from shell.json, in seconds: { screensaver, lock }.
function idleTimeouts(raw) {
  var idle = {}
  try {
    var parsed = JSON.parse(raw)
    if (parsed && parsed.idle && typeof parsed.idle === "object") idle = parsed.idle
  } catch (e) {}
  function seconds(value, fallback) {
    var n = Number(value)
    return value === undefined || value === null || !isFinite(n) || n < 0 ? fallback : Math.round(n)
  }
  return { screensaver: seconds(idle.screensaver, 150), lock: seconds(idle.lock, 300) }
}

// With "screens-off", screens go dark when they would in normal mode, at
// the lock timeout, or at the screensaver one if locking is off.
function screenOffSeconds(timeouts) {
  var t = timeouts || {}
  if (t.lock > 0) return t.lock
  if (t.screensaver > 0) return t.screensaver
  return 300
}

// "2.5 min", "5 min", "45 s".
function formatSeconds(seconds) {
  if (seconds < 60) return seconds + " s"
  var minutes = Math.round(seconds / 6) / 10
  return minutes + " min"
}

// ------------------------------------------------------------ controls

// Volume ring glyph: muted, low, medium, high.
function volumeGlyph(volume, muted) {
  if (muted || !isNum(volume) || volume <= 0) return String.fromCodePoint(0xf075f)
  if (volume < 0.34) return String.fromCodePoint(0xf057f)
  if (volume < 0.67) return String.fromCodePoint(0xf0580)
  return String.fromCodePoint(0xf057e)
}

// Brightness ring glyph by percent.
function brightnessGlyph(percent) {
  if (!isNum(percent) || percent < 34) return String.fromCodePoint(0xf00de)
  if (percent < 67) return String.fromCodePoint(0xf00df)
  return String.fromCodePoint(0xf00e0)
}

// Built-in panels take the backlight; everything else needs DDC/CI.
function isInternalDisplay(name) {
  return /^(eDP|LVDS|DSI)-/.test(String(name || ""))
}

// Turns wheel deltas into whole steps of 120 (one notch), carrying the
// remainder so a touchpad's small deltas still add up: { steps, rest }.
function wheelSteps(carry, delta) {
  var total = (Number(carry) || 0) + (Number(delta) || 0)
  var steps = total > 0 ? Math.floor(total / 120) : Math.ceil(total / 120)
  return { steps: steps, rest: total - steps * 120 }
}

// Keyboard layout emblems. The keymap description hyprctl reports
// ("English (US)", "Russian") picks one by its first word; any other layout
// shows a short code instead.
var LANGUAGES = {
  English: { key: "en", icon: "icons/lang-en.svg" },
  Russian: { key: "ru", icon: "icons/lang-ru.svg" },
  Ukrainian: { key: "uk", icon: "icons/lang-uk.svg" }
}

function languageFor(description) {
  var text = String(description || "")
  if (!text) return { key: "", icon: "", code: "", label: "" }
  var word = text.split(/\s+/)[0]
  var known = Object.prototype.hasOwnProperty.call(LANGUAGES, word) ? LANGUAGES[word] : null
  return {
    key: known ? known.key : "",
    icon: known ? known.icon : "",
    code: word.substring(0, 2).toUpperCase(),
    label: text
  }
}

// Picking the keyboard to read and switch, after Omarchy's keyboard layout
// widget (KeyboardLayoutModel.js, MIT): buttons, the lid switch and the
// virtual keyboard fcitx5 binds also report layouts, so they are left out,
// and the keyboard the last activelayout event named wins, then the one
// furthest through the layout list.
var UNTYPED_KEYBOARDS = /^(hl-virtual-keyboard|power-button|sleep-button|lid-switch|video-bus)/

function isTypedKeyboard(name) {
  return !UNTYPED_KEYBOARDS.test(String(name || ""))
}

function selectKeyboard(keyboards, namedByEvent) {
  var typed = (keyboards || []).filter(function(k) { return k && isTypedKeyboard(k.name) })
  if (typed.length === 0) return null
  var named = typed.filter(function(k) { return k.name === namedByEvent })[0]
  if (named) return named
  return typed.reduce(function(best, k) {
    return (k.active_layout_index || 0) > (best.active_layout_index || 0) ? k : best
  }, typed[0])
}

// Keyboard name from an activelayout event ("keyboard,layout"); "" for the
// fcitx5 virtual keyboard.
function eventKeyboardName(data) {
  var name = String(data || "").split(",")[0]
  return name.indexOf("hl-virtual-keyboard") === 0 ? "" : name
}

// Power profiles, top to bottom as the picker stacks them above the battery
// ring. Glyphs match Omarchy's own power panel.
var POWER_PROFILES = [
  { key: "performance", label: "Performance", icon: 0xf04c5 },
  { key: "balanced", label: "Balanced", icon: 0xf029a },
  { key: "power-saver", label: "Power saver", icon: 0xf032a }
]

// Parses `omarchy-powerprofiles-list --active-state` ("name<TAB>1|0" per
// line) into { profiles: [{ key, label, icon (string) }], active }. Known
// profiles come in POWER_PROFILES order, unknown ones after them.
function parsePowerProfiles(raw) {
  var found = []
  var active = ""
  var lines = String(raw || "").split("\n")
  for (var i = 0; i < lines.length; i++) {
    var parts = lines[i].trim().split("\t")
    var name = parts[0]
    if (!name || found.indexOf(name) !== -1) continue
    found.push(name)
    if (parts[1] === "1") active = name
  }
  var profiles = []
  POWER_PROFILES.forEach(function(p) {
    if (found.indexOf(p.key) !== -1) profiles.push({ key: p.key, label: p.label, icon: String.fromCodePoint(p.icon) })
  })
  found.forEach(function(name) {
    var known = POWER_PROFILES.some(function(p) { return p.key === name })
    if (!known) profiles.push({ key: name, label: name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, " "), icon: String.fromCodePoint(0xf0084) })
  })
  return { profiles: profiles, active: active }
}

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
  case "battery":
    return s.battery.present && isNum(s.battery.percent) ? formatPercent(s.battery.percent) : "N/A"
  }
  return "—"
}

// How full a stat ring is, 0..1, or -1 when there is no reading.
// Usage metrics are percentages; temperature spans 30-100 °C like the system
// panel's meter; fans fill at 6000 RPM; network uses a log scale up to
// 100 MiB/s so a quiet link still shows a sliver.
var RING_TEMPERATURE = { floor: 30, ceiling: 100 }
var RING_FAN_RPM = 6000
var RING_NETWORK_BYTES = 100 * 1024 * 1024

function clamp01(v) { return Math.max(0, Math.min(1, v)) }

function statFraction(key, state) {
  var s = state || {}
  if (s[key] === undefined) return -1
  switch (key) {
  case "cpu": return isNum(s.cpu.percent) ? clamp01(s.cpu.percent / 100) : -1
  case "memory": return isNum(s.memory.percent) ? clamp01(s.memory.percent / 100) : -1
  case "storage": return s.storage.length && isNum(s.storage[0].percent) ? clamp01(s.storage[0].percent / 100) : -1
  case "gpu":
    var g = primaryGpu(s.gpu)
    return g && isNum(g.percent) ? clamp01(g.percent / 100) : -1
  case "temperature":
    var t = s.temperature.cpu
    return isNum(t) ? clamp01((t - RING_TEMPERATURE.floor) / (RING_TEMPERATURE.ceiling - RING_TEMPERATURE.floor)) : -1
  case "fans":
    var rpm = maxValue(s.fans)
    return rpm === null ? -1 : clamp01(rpm / RING_FAN_RPM)
  case "battery":
    return s.battery.present && isNum(s.battery.percent) ? clamp01(s.battery.percent / 100) : -1
  case "network":
    var rate = (isNum(s.network.download) ? s.network.download : 0) + (isNum(s.network.upload) ? s.network.upload : 0)
    return clamp01(Math.log(1 + rate / 1024) / Math.log(1 + RING_NETWORK_BYTES / 1024))
  }
  return -1
}

// Load levels for colouring stat pills. Same thresholds as the System
// Monitor panel: usage turns yellow at 80% and red at 95%, temperatures at
// 85°C and 95°C. Network and fans have no level.
var LEVEL_USAGE = { warning: 80, critical: 95 }
var LEVEL_TEMPERATURE = { warning: 85, critical: 95 }
var LEVEL_RANK = { normal: 0, warning: 1, critical: 2 }
// Low battery is the alarm, and only while it is running on battery.
var LEVEL_BATTERY = { warning: 20, critical: 10 }

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
  case "battery":
    var bat = s.battery
    if (!bat.present || bat.status !== "Discharging" || !isNum(bat.percent)) return "normal"
    if (bat.percent <= LEVEL_BATTERY.critical) return "critical"
    if (bat.percent <= LEVEL_BATTERY.warning) return "warning"
    return "normal"
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
  case "battery":
    var b = s.battery
    if (!b.present) return "No battery"
    var lines = [b.status + (b.plugged && b.status !== "Charging" ? " · plugged in" : "")]
    var left = formatMinutes(b.minutesLeft)
    if (left) lines.push(b.status === "Charging" ? left + " until full" : left + " left")
    if (isNum(b.watts)) lines.push((b.status === "Charging" ? "Charging at " : "Drawing ") + b.watts + " W")
    if (isNum(b.health)) lines.push("Health " + Math.round(b.health) + "% of design capacity")
    return lines.join("\n")
  }
  return ""
}

// ------------------------------------------------------------ pill order

var ISLANDS = ["quickfile", "player", "spaces", "limits", "stats", "controls", "awake"]

// A valid order: every known pill exactly once. Unknown ids are dropped and
// missing ones go back to their default slot.
function normalizeIslandOrder(raw) {
  var out = []
  var list = Array.isArray(raw) ? raw : []
  for (var i = 0; i < list.length; i++) {
    var id = String(list[i])
    if (ISLANDS.indexOf(id) !== -1 && out.indexOf(id) === -1) out.push(id)
  }
  for (var j = 0; j < ISLANDS.length; j++) {
    if (out.indexOf(ISLANDS[j]) === -1) out.splice(Math.min(j, out.length), 0, ISLANDS[j])
  }
  return out
}

// x of every pill but "spaces", which the caller centers.
//   order:  left-to-right ids, including "spaces"
//   widths: { id: width } — a hidden pill has width 0 and takes no gap
//   dock:   { x, width } of the spaces pill
//   full:   true in full-width mode, where the groups sit at the screen
//           edges instead of hugging the spaces pill
function islandLayout(order, widths, dock, gap, full, windowWidth) {
  var at = order.indexOf("spaces")
  var left = order.slice(0, at)
  var right = order.slice(at + 1)
  var out = {}
  var x, i, id
  if (full) {
    x = gap
    for (i = 0; i < left.length; i++) {
      id = left[i]
      out[id] = x
      if (widths[id] > 0) x += widths[id] + gap
    }
    x = windowWidth - gap
    for (i = right.length - 1; i >= 0; i--) {
      id = right[i]
      if (widths[id] > 0) x -= widths[id]
      out[id] = x
      if (widths[id] > 0) x -= gap
    }
    return out
  }
  x = dock.x - gap
  for (i = left.length - 1; i >= 0; i--) {
    id = left[i]
    if (widths[id] > 0) x -= widths[id]
    out[id] = x
    if (widths[id] > 0) x -= gap
  }
  x = dock.x + dock.width + gap
  for (i = 0; i < right.length; i++) {
    id = right[i]
    out[id] = x
    if (widths[id] > 0) x += widths[id] + gap
  }
  return out
}

// New order after dropping `dragged` with its center at `dropCenter`.
// `centers` gives the current center x of every other pill ("spaces"
// included); the dragged pill lands before the first one to its right.
function reorderIslands(order, dragged, dropCenter, centers) {
  var others = order.filter(function(id) { return id !== dragged })
  var index = 0
  for (var i = 0; i < others.length; i++) {
    var c = centers[others[i]]
    if (typeof c === "number" && c < dropCenter) index = i + 1
  }
  others.splice(index, 0, dragged)
  return others
}

// ------------------------------------------------------------ QuickFile

// The QuickFile plugin, an optional companion: the dock only runs its public
// commands and never loads its code.
var QUICKFILE = {
  id: "m0sthatedman.quickfile",
  repo: "https://github.com/baranskyi/omarchy-quickfile.git",
  toggle: "omarchy-shell shell toggle m0sthatedman.quickfile"
}

// "enabled" | "disabled" | "missing" | "unknown" from `omarchy plugin list --json`.
function quickfileState(listJson) {
  var list
  try { list = JSON.parse(String(listJson || "")) } catch (e) { return "unknown" }
  if (!Array.isArray(list)) return "unknown"
  for (var i = 0; i < list.length; i++) {
    var p = list[i]
    if (p && p.id === QUICKFILE.id) return p.enabled === true ? "enabled" : "disabled"
  }
  return "missing"
}

// Shell command for a click on the QuickFile pill in a given state.
function quickfileCommand(state) {
  if (state === "enabled") return QUICKFILE.toggle
  if (state === "disabled") return "omarchy plugin enable " + QUICKFILE.id + " && sleep 1 && " + QUICKFILE.toggle
  if (state === "missing")
    return "omarchy-launch-floating-terminal-with-presentation omarchy plugin add " + QUICKFILE.repo + " --enable"
  return ""
}

function quickfileTooltip(state) {
  if (state === "enabled") return "QuickFile\nClick to open or close"
  if (state === "disabled") return "QuickFile is turned off\nClick to turn it on and open it"
  if (state === "missing") return "QuickFile is not installed\nClick to install it from the Omarchy plugin marketplace"
  return "QuickFile\nChecking whether it is installed…"
}

// ------------------------------------------------------------ AI limits

// One pair of rings per provider: the outer ring is the short session window
// (5-hour), the inner ring the weekly window. `apps` are desktop entry ids
// whose icon becomes the logo in the middle, first one installed wins; the
// letter stands in when none is. No logo files ship with the plugin.
// `logoZoom` crops the transparent padding some app icons carry.
var LIMIT_PROVIDERS = [
  { id: "claude", setting: "limitClaude", name: "Claude", letter: "C", color: "#d97757",
    apps: ["com.anthropic.Claude", "claude-desktop", "claude"], logoZoom: 1.32 },
  { id: "codex", setting: "limitCodex", name: "OpenAI", letter: "O", color: "#10a37f",
    apps: ["codex", "openai-codex", "chatgpt", "com.openai.chatgpt"], logoZoom: 1.32 },
  { id: "grok", setting: "limitGrok", name: "Grok", letter: "G", color: "#8b6cf0",
    apps: ["grok-bot", "grok", "ai.x.grok"], logoZoom: 1.0 }
]

function enabledLimitProviders(settings) {
  var out = []
  if (!settings || !settings.showLimits) return out
  for (var i = 0; i < LIMIT_PROVIDERS.length; i++)
    if (settings[LIMIT_PROVIDERS[i].setting] === true) out.push(LIMIT_PROVIDERS[i])
  return out
}

// Value for llm_limits.py --providers; "" when the island is off.
function limitsProvidersArg(settings) {
  return enabledLimitProviders(settings).map(function(p) { return p.id }).join(",")
}

// Sorts a provider's windows into { session, weekly, extras } by label.
// A window with its own title other than "Weekly" (Claude's per-model
// "Fable Weekly") is an extra, shown in the tooltip only.
function limitWindows(record) {
  var out = { session: null, weekly: null, extras: [] }
  var list = record && Array.isArray(record.limits) ? record.limits : []
  for (var i = 0; i < list.length; i++) {
    var w = list[i]
    if (!w || !isNum(w.percent)) continue
    var label = String(w.label || "")
    var title = String(w.title || "")
    var modelSpecific = title !== "" && !/^weekly$/i.test(title)
    if (!modelSpecific && !out.session && /session|5[- ]?h(our)?/i.test(label)) out.session = w
    else if (!modelSpecific && !out.weekly && /week|7[- ]?day/i.test(label)) out.weekly = w
    else out.extras.push(w)
  }
  return out
}

// Keeps the last numbers when a refresh comes back empty, flagged stale.
function mergeLimitRecord(previous, next) {
  if (!next) return previous || null
  var hasNew = Array.isArray(next.limits) && next.limits.length > 0
  var hadOld = previous && Array.isArray(previous.limits) && previous.limits.length > 0
  if (hasNew || !hadOld) return next
  return {
    available: true,
    plan: next.plan || previous.plan,
    status: next.status || previous.status,
    stale: true,
    updatedAt: previous.updatedAt,
    limits: previous.limits
  }
}

// "in 2h 27m", "in 6d 4h", "in 45m", "now"; "" without a date.
function formatResetIn(iso, nowMs) {
  var t = Date.parse(String(iso || ""))
  if (!isFinite(t)) return ""
  var minutes = Math.max(0, Math.round((t - nowMs) / 60000))
  if (minutes <= 0) return "now"
  var days = Math.floor(minutes / 1440)
  var hours = Math.floor((minutes % 1440) / 60)
  var mins = minutes % 60
  if (days > 0) return "in " + days + "d " + hours + "h"
  if (hours > 0) return "in " + hours + "h " + mins + "m"
  return "in " + mins + "m"
}

function limitPercent(w) {
  return w && isNum(w.percent) ? Math.round(w.percent * 100) + "%" : "—"
}

function padRight(text, width) {
  var s = String(text)
  while (s.length < width) s += " "
  return s
}

function padLeft(text, width) {
  var s = String(text)
  while (s.length < width) s = " " + s
  return s
}

// Tooltip for one provider's rings, in columns for a monospace font:
//   Claude · Max 20x
//
//   Session   5%  resets in 1h 56m
//   Weekly    7%  resets in 6d 13h
//   Fable     4%  resets in 6d 13h
//
//   Sign-in expired
function limitTooltip(provider, record, nowMs) {
  var name = provider.name + (record && record.plan ? " · " + record.plan : "")
  if (!record) return name + "\n\nReading limits…"
  var w = limitWindows(record)
  var rows = [
    { label: "Session", window: w.session, empty: "no 5-hour limit" },
    { label: "Weekly", window: w.weekly, empty: "no weekly limit" }
  ]
  for (var i = 0; i < w.extras.length; i++) {
    var title = String(w.extras[i].title || w.extras[i].label || "")
    rows.push({ label: title.replace(/\s+weekly$/i, "") || title, window: w.extras[i], empty: "" })
  }
  var labelWidth = 0
  for (var r = 0; r < rows.length; r++) labelWidth = Math.max(labelWidth, rows[r].label.length)
  var lines = [name, ""]
  for (var k = 0; k < rows.length; k++) {
    var row = rows[k]
    if (!row.window) {
      lines.push(padRight(row.label, labelWidth) + "     —  " + row.empty)
      continue
    }
    var reset = formatResetIn(row.window.resetsAt, nowMs)
    lines.push(padRight(row.label, labelWidth) + "  " + padLeft(limitPercent(row.window), 4)
      + (reset ? "  resets " + reset : ""))
  }
  var note = record.status || (record.stale ? "Showing the last known numbers" : "")
  if (note) lines.push("", note)
  return lines.join("\n")
}

// Hyprland reports addresses with or without the 0x prefix depending on source.
function normalizeAddress(address) {
  return String(address || "").toLowerCase().replace(/^0x/, "")
}

// Workspace ids to render. `occupied` maps id -> window count for every
// normal (positive id) workspace Hyprland knows about. `activeIds` are
// workspaces that must stay visible even when empty (focused / on-screen).
// `persistentIds` are always shown unless hideEmpty (see dockPersistentIds).
function workspaceIds(occupied, activeIds, persistentIds, hideEmpty) {
  var ids = []
  function add(id) {
    if (id > 0 && ids.indexOf(id) === -1) ids.push(id)
  }

  if (!hideEmpty) for (var p = 0; p < persistentIds.length; p++) add(persistentIds[p])
  for (var key in occupied) {
    var id = Number(key)
    if (occupied[key] > 0 || !hideEmpty) add(id)
  }
  for (var a = 0; a < activeIds.length; a++) add(activeIds[a])

  ids.sort(function(l, r) { return l - r })
  return ids
}

// The always-shown workspaces 1..count for one dock. With perMonitor each id
// shows only on the monitor it belongs to, so it appears on exactly one dock:
// `monitorOf` maps id -> output name (where the workspace is now, else where
// its workspace rule sends it), and ids with no monitor go to `fallback`.
function dockPersistentIds(count, perMonitor, monitorOf, here, fallback) {
  var ids = []
  for (var id = 1; id <= count; id++) {
    var owner = (monitorOf && monitorOf[id]) || fallback || here
    if (!perMonitor || owner === here) ids.push(id)
  }
  return ids
}

// Name of the connected monitor a Hyprland monitor selector points at: an
// output name, or "desc:" and the start of the monitor's description.
//   monitors: [{ name, description }]
function monitorMatching(selector, monitors) {
  var s = String(selector || "")
  if (s === "") return ""
  for (var i = 0; i < (monitors || []).length; i++) {
    var m = monitors[i]
    if (!m || !m.name) continue
    if (s.indexOf("desc:") === 0) {
      var desc = s.slice(5).trim()
      if (desc !== "" && String(m.description || "").indexOf(desc) === 0) return String(m.name)
    } else if (String(m.name) === s) {
      return String(m.name)
    }
  }
  return ""
}

// Where workspace rules put numbered workspaces, as id -> output name, from
// `{"rules": <hyprctl -j workspacerules>, "monitors": <hyprctl -j monitors>}`.
// Rules for monitors that are not connected are left out; a later rule for
// the same workspace wins. Returns null when the text does not parse.
function workspaceHomes(rawJson) {
  var data
  try { data = JSON.parse(String(rawJson || "")) } catch (e) { return null }
  if (!data || !Array.isArray(data.rules)) return null
  var homes = ({})
  for (var i = 0; i < data.rules.length; i++) {
    var rule = data.rules[i] || {}
    var id = String(rule.workspaceString || "")
    if (!/^[0-9]+$/.test(id) || Number(id) <= 0) continue
    var name = monitorMatching(rule.monitor, data.monitors)
    if (name !== "") homes[Number(id)] = name
  }
  return homes
}

// Output under a point in the global logical layout, for dropping a dragged
// workspace there. Outside every screen (a gap between monitors) it picks the
// nearest one. screens: [{ name, x, y, width, height }]
function screenAt(screens, x, y) {
  var best = ""
  var bestDistance = Infinity
  for (var i = 0; i < (screens || []).length; i++) {
    var s = screens[i]
    if (!s || !s.name || !(s.width > 0) || !(s.height > 0)) continue
    if (x >= s.x && x < s.x + s.width && y >= s.y && y < s.y + s.height) return String(s.name)
    var dx = Math.max(s.x - x, 0, x - (s.x + s.width))
    var dy = Math.max(s.y - y, 0, y - (s.y + s.height))
    var distance = dx * dx + dy * dy
    if (distance < bestDistance) {
      best = String(s.name)
      bestDistance = distance
    }
  }
  return best
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
    statLevel: statLevel, LEVEL_USAGE: LEVEL_USAGE, LEVEL_TEMPERATURE: LEVEL_TEMPERATURE, statFraction: statFraction,
    LEVEL_BATTERY: LEVEL_BATTERY, statAvailable: statAvailable, statGlyph: statGlyph, formatMinutes: formatMinutes,
    POWER_PROFILES: POWER_PROFILES, parsePowerProfiles: parsePowerProfiles,
    volumeGlyph: volumeGlyph, brightnessGlyph: brightnessGlyph, isInternalDisplay: isInternalDisplay, wheelSteps: wheelSteps,
    STAY_AWAKE_MODES: STAY_AWAKE_MODES, awakeOptions: awakeOptions, awakeMode: awakeMode, awakeGlyph: awakeGlyph,
    idleTimeouts: idleTimeouts, screenOffSeconds: screenOffSeconds, formatSeconds: formatSeconds,
    LANGUAGES: LANGUAGES, languageFor: languageFor, isTypedKeyboard: isTypedKeyboard, selectKeyboard: selectKeyboard, eventKeyboardName: eventKeyboardName,
    LIMIT_PROVIDERS: LIMIT_PROVIDERS, enabledLimitProviders: enabledLimitProviders,
    limitsProvidersArg: limitsProvidersArg, limitWindows: limitWindows, mergeLimitRecord: mergeLimitRecord,
    formatResetIn: formatResetIn, limitPercent: limitPercent, limitTooltip: limitTooltip,
    ISLANDS: ISLANDS, normalizeIslandOrder: normalizeIslandOrder, islandLayout: islandLayout,
    QUICKFILE: QUICKFILE, quickfileState: quickfileState, quickfileCommand: quickfileCommand, quickfileTooltip: quickfileTooltip,
    reorderIslands: reorderIslands,
    densityMetrics: densityMetrics, normalizeAddress: normalizeAddress,
    agentStates: agentStates, parsePids: parsePids,
    previewWidth: previewWidth, monitorArea: monitorArea, previewLayout: previewLayout, durationFor: durationFor,
    workspaceIds: workspaceIds, workspaceLabel: workspaceLabel, appKey: appKey,
    dockPersistentIds: dockPersistentIds, monitorMatching: monitorMatching, workspaceHomes: workspaceHomes, screenAt: screenAt,
    sortWindows: sortWindows, iconItems: iconItems, truncate: truncate,
    focusedLabel: focusedLabel, webAppHost: webAppHost, appIdCandidates: appIdCandidates, iconPathScore: iconPathScore,
    iconNameFromPath: iconNameFromPath, stepWorkspace: stepWorkspace, mergedEntry: mergedEntry
  }
}
