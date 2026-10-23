// Run: node tests/model.test.js
const fs = require("fs")
const path = require("path")
const assert = require("assert")

const src = fs.readFileSync(path.join(__dirname, "..", "Model.js"), "utf8").replace(/^\.pragma library\s*/, "")
const mod = { exports: {} }
new Function("module", src)(mod)
const M = mod.exports

let failed = 0
function test(name, fn) {
  try { fn(); console.log("ok   " + name) } catch (e) { failed++; console.log("FAIL " + name + "\n     " + e.message) }
}

test("resolveSettings fills defaults and clamps", () => {
  const s = M.resolveSettings({ iconSize: 99, showApps: "bogus", persistentWorkspaces: -3, groupApps: "yes" })
  assert.strictEqual(s.iconSize, 64)
  assert.strictEqual(s.showApps, "hover")
  assert.strictEqual(s.persistentWorkspaces, 0)
  assert.strictEqual(s.groupApps, false)
})

test("workspaceIds keeps persistent, adds occupied and active, sorted", () => {
  assert.deepStrictEqual(M.workspaceIds({ 7: 2, 2: 0 }, [9], 3, false), [1, 2, 3, 7, 9])
})

test("workspaceIds hideEmpty keeps only occupied and active", () => {
  assert.deepStrictEqual(M.workspaceIds({ 1: 0, 4: 1 }, [2], 5, true), [2, 4])
})

test("workspaceLabel", () => {
  assert.strictEqual(M.workspaceLabel(10, false, "number"), "0")
  assert.strictEqual(M.workspaceLabel(3, true, "none"), "")
  assert.notStrictEqual(M.workspaceLabel(3, true, "glyph"), "3")
  assert.strictEqual(M.workspaceLabel(3, false, "glyph"), "3")
})

test("sortWindows orders by x then y, unknown last", () => {
  const w = [{ id: "a", at: [500, 0] }, { id: "b" }, { id: "c", at: [10, 300] }, { id: "d", at: [10, 5] }]
  assert.deepStrictEqual(M.sortWindows(w).map(x => x.id), ["d", "c", "a", "b"])
})

test("iconItems groups same app and keeps focused address", () => {
  const r = M.iconItems([
    { address: "1", appId: "foot", title: "a", focused: false },
    { address: "2", appId: "zen", title: "b", focused: false },
    { address: "3", appId: "Foot", title: "c", focused: true }
  ], true, 8)
  assert.strictEqual(r.items.length, 2)
  assert.strictEqual(r.items[0].count, 2)
  assert.strictEqual(r.items[0].address, "3")
  assert.strictEqual(r.items[0].focused, true)
})

test("iconItems overflow never hides focused", () => {
  const ws = [1, 2, 3, 4, 5].map(i => ({ address: String(i), appId: "a" + i, title: "", focused: i === 5 }))
  const r = M.iconItems(ws, false, 3)
  assert.strictEqual(r.overflow, 2)
  assert.deepStrictEqual(r.items.map(i => i.address), ["1", "2", "5"])
})

test("focusedLabel uses app name for single window, title for many", () => {
  assert.strictEqual(M.focusedLabel({ focused: true, count: 1, title: "t" }, "Foot", 20), "Foot")
  assert.strictEqual(M.focusedLabel({ focused: true, count: 2, title: "long title here" }, "Foot", 6), "long …")
  assert.strictEqual(M.focusedLabel({ focused: false, count: 1 }, "Foot", 20), "")
})

test("webAppHost parses chromium app classes", () => {
  assert.strictEqual(M.webAppHost("chrome-web.whatsapp.com__-Default"), "web.whatsapp.com")
  assert.strictEqual(M.webAppHost("brave-app.hey.com__-Profile_1"), "app.hey.com")
  assert.strictEqual(M.webAppHost("chrome-x.com__home-Default"), "x.com")
  assert.strictEqual(M.webAppHost("foot"), "")
})

test("iconPathScore prefers svg then larger png", () => {
  assert.ok(M.iconPathScore("/a/scalable/apps/x.svg") > M.iconPathScore("/a/128x128/apps/x.png"))
  assert.ok(M.iconPathScore("/a/128x128/apps/x.png") > M.iconPathScore("/a/16x16/apps/x.png"))
  assert.strictEqual(M.iconNameFromPath("/a/b/zen-browser.png"), "zen-browser")
})

test("stepWorkspace wraps", () => {
  assert.strictEqual(M.stepWorkspace([1, 2, 5], 5, 1), 1)
  assert.strictEqual(M.stepWorkspace([1, 2, 5], 1, -1), 5)
  assert.strictEqual(M.stepWorkspace([1, 2, 5], 2, 1), 5)
})

test("mergedEntry keeps id first and applies delta", () => {
  assert.deepStrictEqual(M.mergedEntry("x.y", { id: "old", a: 1 }, { b: 2 }), { id: "x.y", a: 1, b: 2 })
})

test("showsApps respects master switch and modes", () => {
  const s = (o) => M.resolveSettings(o)
  assert.strictEqual(M.showsApps(s({ showIcons: false, showApps: "all" }), true, true, true), false)
  assert.strictEqual(M.showsApps(s({ showApps: "all" }), true, false, false), true)
  assert.strictEqual(M.showsApps(s({ showApps: "all" }), false, true, true), false)
  assert.strictEqual(M.showsApps(s({ showApps: "active" }), true, false, true), false)
  assert.strictEqual(M.showsApps(s({ showApps: "hover" }), true, false, true), true)
  assert.strictEqual(M.showsApps(s({ showApps: "hoverOnly" }), true, true, false), false)
  assert.strictEqual(M.showsApps(s({ showApps: "hoverOnly" }), true, false, true), true)
})

test("new settings validate", () => {
  const s = M.resolveSettings({ density: "huge", iconStyle: "mono", activeClick: "previous", settingsButton: "x" })
  assert.strictEqual(s.density, "normal")
  assert.strictEqual(s.iconStyle, "mono")
  assert.strictEqual(s.activeClick, "previous")
  assert.strictEqual(s.settingsButton, "hover")
  assert.strictEqual(s.showIcons, true)
})

test("normalizeAddress strips 0x and lowercases", () => {
  assert.strictEqual(M.normalizeAddress("0x624FAC"), "624fac")
  assert.strictEqual(M.normalizeAddress("624fac"), "624fac")
})

test("monitorArea removes reserved space in logical coords", () => {
  const a = M.monitorArea({ x: 0, y: 0, width: 3440, height: 1440, scale: 1.25, reserved: [0, 35, 0, 0] })
  assert.deepStrictEqual(a, { x: 0, y: 35, width: 2752, height: 1117 })
  assert.strictEqual(M.monitorArea(null), null)
})

test("previewLayout scales real positions and puts floating last", () => {
  const area = { x: 0, y: 0, width: 1000, height: 500 }
  const out = M.previewLayout([
    { address: "f", at: [100, 100], size: [200, 100], floating: true },
    { address: "a", at: [0, 0], size: [500, 500] },
    { address: "b", at: [500, 0], size: [500, 500] }
  ], area, 100, 50)
  assert.deepStrictEqual(out.map(p => p.address), ["a", "b", "f"])
  assert.deepStrictEqual(out[1], { address: "b", x: 50, y: 0, width: 50, height: 50, floating: false })
  assert.deepStrictEqual([out[2].x, out[2].y, out[2].width, out[2].height], [10, 10, 20, 10])
})

test("previewLayout clamps windows hanging off screen", () => {
  const out = M.previewLayout([{ address: "a", at: [-100, 0], size: [300, 100] }], { x: 0, y: 0, width: 1000, height: 1000 }, 100, 100)
  assert.deepStrictEqual([out[0].x, out[0].width], [0, 20])
})

test("previewLayout falls back to a grid without positions", () => {
  const out = M.previewLayout([{ address: "a" }, { address: "b" }, { address: "c" }], null, 100, 100)
  assert.strictEqual(out.length, 3)
  assert.strictEqual(out[0].x, 0)
  assert.ok(out[1].x > 0)
  assert.ok(out[2].y > 0)
})

test("preview settings validate", () => {
  const s = M.resolveSettings({ previewSize: "huge", previews: false })
  assert.strictEqual(s.previewSize, "medium")
  assert.strictEqual(s.previews, false)
  assert.strictEqual(s.previewLive, true)
  assert.strictEqual(M.previewWidth("large"), 520)
})

test("appIdCandidates adds the last reverse-DNS segment", () => {
  assert.deepStrictEqual(M.appIdCandidates("dev.tgomareli.logi-kvm-console"), ["dev.tgomareli.logi-kvm-console", "logi-kvm-console"])
  assert.deepStrictEqual(M.appIdCandidates("Slack"), ["Slack", "slack"])
  assert.deepStrictEqual(M.appIdCandidates(""), [])
})

test("agentStates picks the nearest window and the most urgent state", () => {
  const windows = { 100: true, 200: true, 300: true }
  const agents = {
    a: { state: "working", pids: [5, 6, 100, 200] },
    b: { state: "waiting", pids: [7, 100] },
    c: { state: "done", pids: [8, 300] },
    d: { state: "idle", pids: [9, 300] },
    e: { state: "working", pids: [10, 11] }
  }
  assert.deepStrictEqual(M.agentStates(agents, windows), { 100: "waiting", 300: "done" })
})

test("parsePids drops junk and init", () => {
  assert.deepStrictEqual(M.parsePids("12,abc,1,,34"), [12, 34])
})

test("dock settings default and clamp", () => {
  const d = M.resolveSettings({})
  assert.strictEqual(d.dockHeight, 56)
  assert.strictEqual(d.iconSize, 28)
  assert.strictEqual(d.bottomMargin, 0)
  assert.strictEqual(d.reserveSpace, true)
  assert.strictEqual(d.alignment, "center")
  assert.strictEqual(d.monitors, "all")
  assert.strictEqual(d.hideWithBar, true)
  const s = M.resolveSettings({ dockHeight: 500, bottomMargin: -4, reserveSpace: "no", alignment: "left", monitors: "  HDMI-A-1 ", iconSize: 3 })
  assert.strictEqual(s.dockHeight, 96)
  assert.strictEqual(s.bottomMargin, 0)
  assert.strictEqual(s.reserveSpace, true)
  assert.strictEqual(s.alignment, "center")
  assert.strictEqual(s.monitors, "HDMI-A-1")
  assert.strictEqual(s.iconSize, 12)
  assert.strictEqual(M.resolveSettings({ dockHeight: 10, monitors: 5 }).dockHeight, 40)
  assert.strictEqual(M.resolveSettings({ monitors: "" }).monitors, "all")
})

test("dockMetrics grows with height and keeps icons inside the pill", () => {
  let prev = null
  for (let h = 40; h <= 96; h += 4) {
    const m = M.dockMetrics(M.resolveSettings({ dockHeight: h, iconSize: 64 }), 1.17)
    assert.ok(m.iconPx <= m.pillThickness - 6, "icon fits at " + h)
    assert.ok(m.pillThickness < h, "pill inside dock at " + h)
    if (prev) {
      assert.ok(m.pillThickness >= prev.pillThickness)
      assert.ok(m.pad >= prev.pad)
      assert.ok(m.labelPx >= prev.labelPx)
    }
    prev = m
  }
})

test("dockMetrics at defaults roughly doubles the bar widget", () => {
  const m = M.dockMetrics(M.resolveSettings({}), 1.17)
  assert.strictEqual(m.pillThickness, 47)
  assert.strictEqual(m.iconPx, 28)
  assert.ok(m.k > 1.9 && m.k < 2.1)
  const roomy = M.dockMetrics(M.resolveSettings({ density: "roomy" }), 1.17)
  assert.ok(roomy.gap > m.gap && roomy.pad > m.pad)
})

test("primaryScreenName picks the lowest Hyprland id", () => {
  assert.strictEqual(M.primaryScreenName([{ name: "HDMI-A-1", id: 1 }, { name: "eDP-1", id: 0 }]), "eDP-1")
  assert.strictEqual(M.primaryScreenName([]), "")
  assert.strictEqual(M.primaryScreenName(null), "")
})

test("screenSelected handles all, primary and a named output", () => {
  assert.strictEqual(M.screenSelected("all", "eDP-1", "HDMI-A-1"), true)
  assert.strictEqual(M.screenSelected("primary", "eDP-1", "HDMI-A-1"), false)
  assert.strictEqual(M.screenSelected("primary", "HDMI-A-1", "HDMI-A-1"), true)
  assert.strictEqual(M.screenSelected("primary", "eDP-1", ""), true)
  assert.strictEqual(M.screenSelected("HDMI-A-1", "HDMI-A-1", "eDP-1"), true)
  assert.strictEqual(M.screenSelected("HDMI-A-1", "eDP-1", "eDP-1"), false)
  assert.strictEqual(M.screenSelected("HDMI-A-1", "eDP-1", "eDP-1", ["eDP-1", "HDMI-A-1"]), false)
  assert.strictEqual(M.screenSelected("HDMI-A-1", "eDP-1", "eDP-1", ["eDP-1"]), true)
})

test("pluginEntry finds the top-level plugins entry", () => {
  const raw = JSON.stringify({ bar: { layout: { left: [{ id: M.PLUGIN_ID }] } }, plugins: [{ id: "x" }, { id: M.PLUGIN_ID, dockHeight: 72 }] })
  assert.deepStrictEqual(M.pluginEntry(raw, M.PLUGIN_ID), { id: M.PLUGIN_ID, dockHeight: 72 })
  assert.strictEqual(M.pluginEntry("{not json", M.PLUGIN_ID), null)
  assert.strictEqual(M.pluginEntry(JSON.stringify({ plugins: [{ id: "x" }] }), M.PLUGIN_ID), null)
  assert.strictEqual(M.pluginEntry(JSON.stringify({}), M.PLUGIN_ID), null)
  assert.strictEqual(M.pluginEntry("", M.PLUGIN_ID), null)
})


test("player and stats settings default and validate", () => {
  const d = M.resolveSettings({})
  assert.strictEqual(d.showPlayer, true)
  assert.strictEqual(d.playerSource, "spotify")
  assert.strictEqual(d.playerControls, true)
  assert.strictEqual(d.showStats, true)
  assert.deepStrictEqual([d.statCpu, d.statMemory, d.statTemperature, d.statGpu, d.statStorage, d.statNetwork, d.statFans],
    [true, true, true, false, false, false, false])
  assert.strictEqual(M.resolveSettings({ playerSource: "vlc" }).playerSource, "spotify")
  assert.strictEqual(M.resolveSettings({ playerSource: "any" }).playerSource, "any")
})


test("isSpotifyPlayer and isProxyPlayer", () => {
  assert.strictEqual(M.isSpotifyPlayer("Spotify", "", ""), true)
  assert.strictEqual(M.isSpotifyPlayer("", "spotify", ""), true)
  assert.strictEqual(M.isSpotifyPlayer("", "", "org.mpris.MediaPlayer2.spotify"), true)
  assert.strictEqual(M.isSpotifyPlayer("Firefox", "firefox", "org.mpris.MediaPlayer2.firefox.instance1"), false)
  assert.strictEqual(M.isProxyPlayer("org.mpris.MediaPlayer2.playerctld", ""), true)
})

test("pickPlayer: Spotify as soon as it runs, other players only with a track", () => {
  const p = (key, o) => Object.assign({ key, spotify: false, proxy: false, playing: false, stopped: false, hasTrack: true }, o)
  const list = [p("firefox", { playing: true }), p("spotify", { spotify: true }), p("ctl", { proxy: true, playing: true })]
  assert.strictEqual(M.pickPlayer(list, "spotify", ""), 1)
  // Spotify shows as soon as it runs, even stopped and without a track.
  assert.strictEqual(M.pickPlayer([p("spotify", { spotify: true, stopped: true })], "spotify", ""), 0)
  assert.strictEqual(M.pickPlayer([p("spotify", { spotify: true, hasTrack: false, stopped: true })], "spotify", ""), 0)
  assert.strictEqual(M.pickPlayer([p("firefox", { playing: true })], "spotify", ""), -1)
  // Other players still need a track.
  assert.strictEqual(M.pickPlayer([p("firefox", { stopped: true })], "any", ""), -1)
  assert.strictEqual(M.pickPlayer([p("firefox", { hasTrack: false })], "any", ""), -1)
  // A playing browser beats an idle Spotify in "any" mode.
  assert.strictEqual(M.pickPlayer([p("spotify", { spotify: true, stopped: true, hasTrack: false }), p("firefox", { playing: true })], "any", ""), 1)
  assert.strictEqual(M.pickPlayer([], "any", ""), -1)
})

test("pickPlayer: any prefers playing, then the last controlled player", () => {
  const p = (key, o) => Object.assign({ key, spotify: false, proxy: false, playing: false, stopped: false, hasTrack: true }, o)
  assert.strictEqual(M.pickPlayer([p("a"), p("b", { playing: true })], "any", ""), 1)
  assert.strictEqual(M.pickPlayer([p("ctl", { proxy: true, playing: true }), p("b", { playing: true })], "any", ""), 1)
  assert.strictEqual(M.pickPlayer([p("a", { playing: true }), p("b", { playing: true })], "any", "b"), 1)
  assert.strictEqual(M.pickPlayer([p("a", { playing: true }), p("b")], "any", "b"), 0)
  assert.strictEqual(M.pickPlayer([p("a"), p("b")], "any", "b"), 1)
  assert.strictEqual(M.pickPlayer([p("ctl", { proxy: true }), p("b")], "any", ""), 1)
})

test("enabledStats keeps island order and respects the master switch", () => {
  const s = M.resolveSettings({ statGpu: true, statFans: true })
  assert.deepStrictEqual(M.enabledStats(s).map(m => m.key), ["cpu", "gpu", "memory", "fans", "temperature", "battery"])
  assert.strictEqual(M.statsMetricsArg(s), "cpu,gpu,memory,fans,temperature,battery")
  assert.strictEqual(M.enabledStats(M.resolveSettings({ showStats: false })).length, 0)
  assert.strictEqual(M.statsMetricsArg(M.resolveSettings({ showStats: false })), "")
  assert.strictEqual(M.enabledStats(s)[0].icon, String.fromCodePoint(0xf0ee0))
})

test("formatters", () => {
  assert.strictEqual(M.formatPercent(55.6), "56%")
  assert.strictEqual(M.formatPercent(null), "N/A")
  assert.strictEqual(M.formatBytes(1536), "1.5 KiB")
  assert.strictEqual(M.formatBytes(512), "512 B")
  assert.strictEqual(M.formatRate(0), "0")
  assert.strictEqual(M.formatRate(950), "950")
  assert.strictEqual(M.formatRate(12 * 1024), "12K")
  assert.strictEqual(M.formatRate(1.2 * 1024 * 1024), "1.2M")
})

test("statText and statDetail from a snapshot", () => {
  const state = {
    cpu: { name: "Intel", percent: 15.5, threads: 20, load: [5.2, 5.1, 5] },
    memory: { percent: 56, used: 8 * 1024 ** 3, total: 16 * 1024 ** 3, swapUsed: 0, swapTotal: 0 },
    temperature: { cpu: 64.2, sensors: [{ chip: "coretemp", name: "Package id 0", value: 64.2 }, { chip: "nvme", name: "Composite", value: 40 }, { chip: "nvme", name: "Sensor 1", value: 45 }] },
    gpu: [{ name: "Intel", percent: null, frequencyMHz: 900, asleep: false }, { name: "NVIDIA", percent: null, asleep: true }],
    storage: [{ mount: "/", percent: 36.1, used: 1, total: 2, free: 1 }],
    network: { download: 155459, upload: 12, interfaces: [{ name: "wlan0", download: 155459, upload: 12 }] },
    fans: [{ name: "thinkpad fan1", value: 3872 }, { name: "acpi fan1", value: 0 }]
  }
  assert.strictEqual(M.statText("cpu", state), "16%")
  assert.strictEqual(M.statText("memory", state), "56%")
  assert.strictEqual(M.statText("temperature", state), "64°C")
  assert.strictEqual(M.statText("gpu", state), "900 MHz")
  assert.strictEqual(M.statText("storage", state), "36%")
  assert.strictEqual(M.statText("network", state), "↓152K ↑12")
  assert.strictEqual(M.statText("fans", state), "3872 RPM")
  assert.strictEqual(M.statText("cpu", {}), "—")
  assert.strictEqual(M.statDetail("temperature", state), "CPU 64°C · SSD 40–45°C")
  assert.ok(M.statDetail("gpu", state).indexOf("NVIDIA · asleep") !== -1)
  assert.ok(M.statDetail("cpu", state).indexOf("20 threads") !== -1)
  assert.strictEqual(M.statDetail("memory", {}), "Reading system information…")
})

test("stats.py snapshot renders through statText", () => {
  const { spawnSync } = require("child_process")
  const run = spawnSync("python3", ["-I", "-B", path.join(__dirname, "..", "stats.py"), "--once", "--metrics", "cpu,memory,temperature,storage,network,fans"], { encoding: "utf8", timeout: 15000 })
  assert.strictEqual(run.status, 0, run.stderr)
  const state = JSON.parse(run.stdout.trim().split("\n").pop())
  assert.deepStrictEqual(state.metrics, ["cpu", "fans", "memory", "network", "storage", "temperature"])
  assert.strictEqual(state.gpu, undefined, "gpu is not collected unless asked for")
  for (const key of ["cpu", "memory", "storage", "network"]) {
    const text = M.statText(key, state)
    assert.ok(text !== "—" && text !== "N/A", key + " -> " + text)
  }
  assert.ok(/^(\d+°C|N\/A)$/.test(M.statText("temperature", state)))
})

test("statLevel: normal, warning at 80% / 85°C, critical at 95% / 95°C", () => {
  const st = (o) => Object.assign({
    cpu: { percent: 10 }, memory: { percent: 10 }, storage: [{ percent: 10 }],
    temperature: { cpu: 50, sensors: [] }, gpu: [], network: { download: 9e9, upload: 9e9 }, fans: [{ value: 9000 }]
  }, o)
  assert.strictEqual(M.statLevel("cpu", st()), "normal")
  assert.strictEqual(M.statLevel("cpu", st({ cpu: { percent: 79.9 } })), "normal")
  assert.strictEqual(M.statLevel("cpu", st({ cpu: { percent: 80 } })), "warning")
  assert.strictEqual(M.statLevel("cpu", st({ cpu: { percent: 95 } })), "critical")
  assert.strictEqual(M.statLevel("memory", st({ memory: { percent: 90 } })), "warning")
  assert.strictEqual(M.statLevel("storage", st({ storage: [{ percent: 97 }] })), "critical")
  assert.strictEqual(M.statLevel("temperature", st({ temperature: { cpu: 84 } })), "normal")
  assert.strictEqual(M.statLevel("temperature", st({ temperature: { cpu: 85 } })), "warning")
  assert.strictEqual(M.statLevel("temperature", st({ temperature: { cpu: 99 } })), "critical")
  assert.strictEqual(M.statLevel("gpu", st({ gpu: [{ percent: 20, temperature: 88 }, { percent: null, asleep: true }] })), "warning")
  assert.strictEqual(M.statLevel("gpu", st({ gpu: [{ percent: 96 }] })), "critical")
  assert.strictEqual(M.statLevel("network", st()), "normal")
  assert.strictEqual(M.statLevel("fans", st()), "normal")
  assert.strictEqual(M.statLevel("cpu", {}), "normal")
  assert.strictEqual(M.statLevel("cpu", st({ cpu: { percent: null } })), "normal")
})

test("limits settings default on and give the collector's provider list", () => {
  const d = M.resolveSettings({})
  assert.deepStrictEqual([d.showLimits, d.limitClaude, d.limitCodex, d.limitGrok], [true, true, true, true])
  assert.strictEqual(M.limitsProvidersArg(d), "claude,codex,grok")
  assert.strictEqual(M.limitsProvidersArg(M.resolveSettings({ limitCodex: false })), "claude,grok")
  assert.strictEqual(M.limitsProvidersArg(M.resolveSettings({ showLimits: false })), "")
  for (const p of M.LIMIT_PROVIDERS) assert.ok(Array.isArray(p.apps) && p.apps.length > 0, p.id + " has logo candidates")
})

test("limitWindows sorts session, weekly and model-specific windows", () => {
  const claude = { limits: [
    { label: "Session (5-hour)", percent: 0.04, resetsAt: "2026-10-21T13:10:00Z" },
    { label: "Weekly (7-day)", percent: 0.07, resetsAt: "2026-10-28T01:00:00Z" },
    { label: "Fable Weekly", title: "Fable Weekly", percent: 0.04, resetsAt: "2026-10-28T01:00:00Z" }
  ] }
  const w = M.limitWindows(claude)
  assert.strictEqual(w.session.percent, 0.04)
  assert.strictEqual(w.weekly.percent, 0.07)
  assert.deepStrictEqual(w.extras.map(e => e.title), ["Fable Weekly"])
  const grok = M.limitWindows({ limits: [{ label: "Weekly (7-day)", title: "Weekly", percent: 0.11 }] })
  assert.strictEqual(grok.session, null)
  assert.strictEqual(grok.weekly.percent, 0.11)
  assert.strictEqual(M.limitWindows({ limits: [{ label: "5h window", percent: 0.5 }] }).session.percent, 0.5)
  assert.deepStrictEqual(M.limitWindows(null), { session: null, weekly: null, extras: [] })
})

test("mergeLimitRecord keeps the last numbers when a refresh comes back empty", () => {
  const prev = { available: true, plan: "pro", status: "", stale: false, updatedAt: "a", limits: [{ label: "Weekly", percent: 0.79 }] }
  const empty = { available: true, plan: "pro", status: "Codex limits unavailable", stale: false, updatedAt: "b", limits: [] }
  const merged = M.mergeLimitRecord(prev, empty)
  assert.strictEqual(merged.stale, true)
  assert.strictEqual(merged.limits[0].percent, 0.79)
  assert.strictEqual(merged.status, "Codex limits unavailable")
  const fresh = { available: true, plan: "pro", status: "", stale: false, updatedAt: "c", limits: [{ label: "Weekly", percent: 0.8 }] }
  assert.strictEqual(M.mergeLimitRecord(prev, fresh), fresh)
  assert.strictEqual(M.mergeLimitRecord(null, empty), empty)
})

test("formatResetIn and limitTooltip", () => {
  const now = Date.parse("2026-10-21T10:43:00Z")
  assert.strictEqual(M.formatResetIn("2026-10-21T13:10:00Z", now), "in 2h 27m")
  assert.strictEqual(M.formatResetIn("2026-10-28T01:00:00Z", now), "in 6d 14h")
  assert.strictEqual(M.formatResetIn("2026-10-21T10:50:00Z", now), "in 7m")
  assert.strictEqual(M.formatResetIn("2026-10-21T10:00:00Z", now), "now")
  assert.strictEqual(M.formatResetIn("", now), "")
  const tip = M.limitTooltip(M.LIMIT_PROVIDERS[0], { plan: "Max 20x", status: "", stale: false, limits: [
    { label: "Session (5-hour)", percent: 0.04, resetsAt: "2026-10-21T13:10:00Z" },
    { label: "Weekly (7-day)", percent: 0.07, resetsAt: "2026-10-28T01:00:00Z" },
    { label: "Fable Weekly", title: "Fable Weekly", percent: 0.04, resetsAt: "2026-10-28T01:00:00Z" }
  ] }, now)
  assert.strictEqual(tip, [
    "Claude · Max 20x",
    "",
    "Session    4%  resets in 2h 27m",
    "Weekly     7%  resets in 6d 14h",
    "Fable      4%  resets in 6d 14h"
  ].join("\n"))
  const grokTip = M.limitTooltip(M.LIMIT_PROVIDERS[2], { plan: "SuperGrok Plus", status: "", limits: [{ label: "Weekly (7-day)", percent: 0.11 }] }, now)
  assert.strictEqual(grokTip, ["Grok · SuperGrok Plus", "", "Session     —  no 5-hour limit", "Weekly    11%"].join("\n"))
  const expired = M.limitTooltip(M.LIMIT_PROVIDERS[0], { plan: "Max 20x", status: "Sign-in expired", limits: [{ label: "Weekly (7-day)", percent: 0.07 }] }, now)
  assert.ok(expired.endsWith("\n\nSign-in expired"))
  assert.strictEqual(M.limitTooltip(M.LIMIT_PROVIDERS[1], null, now), "OpenAI\n\nReading limits…")
})

test("llm_limits.py reports a missing collector without crashing", () => {
  const { spawnSync } = require("child_process")
  const run = spawnSync("python3", ["-I", "-B", "-c", [
    "import sys, json, runpy",
    "sys.argv=['llm_limits.py']",
    "m=runpy.run_path(" + JSON.stringify(path.join(__dirname, "..", "llm_limits.py")) + ")",
    "m['COLLECTORS']['claude']=['/nonexistent/collector']",
    "print(json.dumps(m['collect']('claude', 5)[1]))"
  ].join("\n")], { encoding: "utf8", timeout: 15000 })
  assert.strictEqual(run.status, 0, run.stderr)
  const out = JSON.parse(run.stdout.trim())
  assert.strictEqual(out.available, false)
  assert.ok(/not found/.test(out.status))
  assert.deepStrictEqual(out.limits, [])
})

test("normalizeIslandOrder keeps every pill once and restores missing ones", () => {
  assert.deepStrictEqual(M.resolveSettings({}).islandOrder, ["quickfile", "player", "spaces", "limits", "stats"])
  assert.deepStrictEqual(M.normalizeIslandOrder(["stats", "spaces", "player", "limits", "quickfile"]), ["stats", "spaces", "player", "limits", "quickfile"])
  // An order saved before the QuickFile pill existed gets it back at its default slot.
  assert.deepStrictEqual(M.normalizeIslandOrder(["player", "spaces", "limits", "stats"]), ["quickfile", "player", "spaces", "limits", "stats"])
  const fixed = M.normalizeIslandOrder(["stats", "bogus", "stats", "spaces"])
  assert.deepStrictEqual(fixed.slice().sort(), ["limits", "player", "quickfile", "spaces", "stats"])
  assert.strictEqual(fixed.indexOf("stats"), fixed.lastIndexOf("stats"))
  assert.deepStrictEqual(M.normalizeIslandOrder("nope"), ["quickfile", "player", "spaces", "limits", "stats"])
})

test("islandLayout hugs the centered spaces pill and skips hidden pills", () => {
  const widths = { player: 268, limits: 150, stats: 300 }
  const dock = { x: 1000, width: 500 }
  assert.deepStrictEqual(M.islandLayout(["player", "spaces", "limits", "stats"], widths, dock, 12, false, 2560),
    { player: 720, limits: 1512, stats: 1674 })
  assert.deepStrictEqual(M.islandLayout(["stats", "player", "spaces", "limits"], widths, dock, 12, false, 2560),
    { stats: 408, player: 720, limits: 1512 })
  const hidden = M.islandLayout(["player", "spaces", "limits", "stats"], { player: 0, limits: 150, stats: 300 }, dock, 12, false, 2560)
  assert.strictEqual(hidden.limits, 1512)
  assert.strictEqual(hidden.stats, 1674)
  assert.deepStrictEqual(M.islandLayout(["player", "spaces", "limits", "stats"], widths, dock, 12, true, 2560),
    { player: 12, limits: 2086, stats: 2248 })
})

test("reorderIslands drops a pill before the first pill to its right", () => {
  const order = ["player", "spaces", "limits", "stats"]
  const centers = { player: 854, spaces: 1250, limits: 1587, stats: 1824 }
  assert.deepStrictEqual(M.reorderIslands(order, "stats", 1400, centers), ["player", "spaces", "stats", "limits"])
  assert.deepStrictEqual(M.reorderIslands(order, "stats", 600, centers), ["stats", "player", "spaces", "limits"])
  assert.deepStrictEqual(M.reorderIslands(order, "player", 1300, centers), ["spaces", "player", "limits", "stats"])
  assert.deepStrictEqual(M.reorderIslands(order, "limits", 1600, centers), order)
})

test("Grok token refresh is opt-in", () => {
  assert.strictEqual(M.resolveSettings({}).limitGrokRefresh, false)
  assert.strictEqual(M.resolveSettings({ limitGrokRefresh: true }).limitGrokRefresh, true)
  const { spawnSync } = require("child_process")
  const script = path.join(__dirname, "..", "llm_limits.py")
  const run = spawnSync("python3", ["-I", "-B", "-c", [
    "import sys, json, runpy",
    "sys.argv=['llm_limits.py']",
    "m=runpy.run_path(" + JSON.stringify(script) + ")",
    "before=list(m['COLLECTORS']['grok'])",
    "m['allow_grok_refresh']()",
    "print(json.dumps([before, m['COLLECTORS']['grok']]))"
  ].join("\n")], { encoding: "utf8", timeout: 15000 })
  assert.strictEqual(run.status, 0, run.stderr)
  const [before, after] = JSON.parse(run.stdout.trim())
  assert.ok(before.includes("--no-refresh"), "read-only by default")
  assert.ok(!after.includes("--no-refresh"), "--grok-refresh lifts it")
  const help = spawnSync("python3", ["-I", "-B", path.join(__dirname, "..", "collectors", "grok-usage"), "--help"], { encoding: "utf8", timeout: 15000 })
  assert.ok(help.stdout.includes("--no-refresh"))
})

test("quickfileState reads omarchy plugin list --json", () => {
  const list = enabled => JSON.stringify([{ id: "omarchy.menu", enabled: true }, { id: "m0sthatedman.quickfile", enabled }])
  assert.strictEqual(M.quickfileState(list(true)), "enabled")
  assert.strictEqual(M.quickfileState(list(false)), "disabled")
  assert.strictEqual(M.quickfileState(JSON.stringify([{ id: "omarchy.menu", enabled: true }])), "missing")
  assert.strictEqual(M.quickfileState("not json"), "unknown")
  assert.strictEqual(M.quickfileState("{}"), "unknown")
})

test("quickfileCommand opens, enables or offers to install QuickFile", () => {
  assert.strictEqual(M.quickfileCommand("enabled"), "omarchy-shell shell toggle m0sthatedman.quickfile")
  assert.ok(M.quickfileCommand("disabled").startsWith("omarchy plugin enable m0sthatedman.quickfile && "))
  const install = M.quickfileCommand("missing")
  assert.ok(install.startsWith("omarchy-launch-floating-terminal-with-presentation omarchy plugin add https://github.com/baranskyi/omarchy-quickfile.git"))
  assert.ok(!install.includes("--yes"), "the installer must still ask for consent")
  assert.strictEqual(M.quickfileCommand("unknown"), "")
  assert.ok(M.quickfileTooltip("missing").includes("marketplace"))
})

test("statsStyle defaults to rings", () => {
  assert.strictEqual(M.resolveSettings({}).statsStyle, "rings")
  assert.strictEqual(M.resolveSettings({ statsStyle: "values" }).statsStyle, "values")
  assert.strictEqual(M.resolveSettings({ statsStyle: "bars" }).statsStyle, "rings")
})

test("statFraction maps each metric onto its ring", () => {
  const state = {
    cpu: { percent: 25 }, memory: { percent: 50 }, storage: [{ percent: 36 }],
    temperature: { cpu: 65, sensors: [] },
    gpu: [{ name: "Intel", percent: null, frequencyMHz: 900 }, { name: "NVIDIA", percent: 40 }],
    fans: [{ value: 3000 }, { value: 0 }],
    network: { download: 0, upload: 0 }
  }
  assert.strictEqual(M.statFraction("cpu", state), 0.25)
  assert.strictEqual(M.statFraction("memory", state), 0.5)
  assert.strictEqual(M.statFraction("storage", state), 0.36)
  assert.strictEqual(M.statFraction("temperature", state), 0.5)
  assert.strictEqual(M.statFraction("gpu", state), 0.4)
  assert.strictEqual(M.statFraction("fans", state), 0.5)
  assert.strictEqual(M.statFraction("network", state), 0)
  assert.ok(M.statFraction("network", { network: { download: 50 * 1024, upload: 0 } }) > 0.2, "a quiet link still shows")
  assert.strictEqual(M.statFraction("network", { network: { download: 1e12, upload: 0 } }), 1)
  assert.strictEqual(M.statFraction("temperature", { temperature: { cpu: 20 } }), 0)
  assert.strictEqual(M.statFraction("temperature", { temperature: { cpu: 120 } }), 1)
  assert.strictEqual(M.statFraction("cpu", {}), -1)
  assert.strictEqual(M.statFraction("gpu", { gpu: [{ name: "NVIDIA", asleep: true, percent: null }] }), -1)
})

test("grok collector never reads session history and keeps its cache private", () => {
  const fs = require("fs"), os = require("os"), { spawnSync } = require("child_process")
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "spaces-dock-grok-"))
  const grokHome = path.join(home, ".grok")
  const cache = path.join(home, "cache")
  fs.mkdirSync(path.join(grokHome, "sessions", "s1"), { recursive: true })
  fs.writeFileSync(path.join(grokHome, "sessions", "s1", "updates.jsonl"), '{"type":"turn_completed","usage":{"input_tokens":5}}\n')
  fs.mkdirSync(path.join(cache, "omarchy", "agent-usage"), { recursive: true, mode: 0o755 })
  const run = spawnSync("python3", ["-I", "-B", path.join(__dirname, "..", "collectors", "grok-usage"), "--limits-only", "--no-refresh"], {
    encoding: "utf8", timeout: 20000,
    env: Object.assign({}, process.env, { HOME: home, GROK_HOME: grokHome, XDG_CACHE_HOME: cache })
  })
  assert.strictEqual(run.status, 0, run.stderr)
  const record = JSON.parse(run.stdout.trim())
  assert.deepStrictEqual(record.limits, [])
  assert.ok(!("totalPrompts" in record), "no activity stats in the record")
  const dir = path.join(cache, "omarchy", "agent-usage")
  assert.strictEqual(fs.statSync(dir).mode & 0o777, 0o700, "cache dir tightened to 0700")
  assert.ok(!fs.existsSync(path.join(dir, "grok-scan.json")), "no activity summary written")
  for (const f of fs.readdirSync(dir)) assert.strictEqual(fs.statSync(path.join(dir, f)).mode & 0o077, 0, f + " is private")
  const src = fs.readFileSync(path.join(__dirname, "..", "collectors", "grok-usage"), "utf8")
  assert.ok(!/0o644/.test(src), "no world-readable writes")
  assert.ok(!/def scan_sessions|grok-scan/.test(src.replace(/#.*$/gm, "")), "no session scanning code")
  fs.rmSync(home, { recursive: true, force: true })
})

test("battery ring: fill, levels only while discharging, glyph and details", () => {
  const bat = o => ({ battery: Object.assign({ present: true, percent: 57, status: "Discharging", plugged: false, watts: 9.8, minutesLeft: 151, health: 84 }, o) })
  assert.strictEqual(M.resolveSettings({}).statBattery, true)
  assert.strictEqual(M.statFraction("battery", bat()), 0.57)
  assert.strictEqual(M.statText("battery", bat()), "57%")
  assert.strictEqual(M.statLevel("battery", bat()), "normal")
  assert.strictEqual(M.statLevel("battery", bat({ percent: 20 })), "warning")
  assert.strictEqual(M.statLevel("battery", bat({ percent: 9 })), "critical")
  assert.strictEqual(M.statLevel("battery", bat({ percent: 9, status: "Charging", plugged: true })), "normal")
  assert.strictEqual(M.statGlyph("battery", bat(), "B"), "B")
  assert.strictEqual(M.statGlyph("battery", bat({ status: "Charging", plugged: true }), "B"), String.fromCodePoint(0xf0084))
  assert.strictEqual(M.statGlyph("cpu", bat(), "C"), "C")
  assert.strictEqual(M.statDetail("battery", bat()), "Discharging\n2h 31m left\nDrawing 9.8 W\nHealth 84% of design capacity")
  assert.strictEqual(M.statDetail("battery", bat({ status: "Charging", plugged: true, minutesLeft: 45, watts: 30 })),
    "Charging\n45m until full\nCharging at 30 W\nHealth 84% of design capacity")
  assert.strictEqual(M.statDetail("battery", bat({ status: "Not charging", plugged: true, minutesLeft: null, watts: null })),
    "Not charging · plugged in\nHealth 84% of design capacity")
  assert.strictEqual(M.statAvailable("battery", bat()), true)
  assert.strictEqual(M.statAvailable("battery", { battery: { present: false } }), false)
  assert.strictEqual(M.statAvailable("battery", {}), false)
  assert.strictEqual(M.statAvailable("cpu", {}), true)
  assert.strictEqual(M.statDetail("battery", { battery: { present: false } }), "No battery")
})

test("power profiles: picker order, active profile, missing and unknown ones", () => {
  // omarchy-powerprofiles-list prints power-saver first.
  const listed = M.parsePowerProfiles("power-saver\t0\nbalanced\t1\nperformance\t0\n")
  assert.deepStrictEqual(listed.profiles.map(p => p.key), ["performance", "balanced", "power-saver"])
  assert.strictEqual(listed.active, "balanced")
  assert.strictEqual(listed.profiles[2].label, "Power saver")
  assert.strictEqual(listed.profiles[0].icon, String.fromCodePoint(0xf04c5))
  // No performance profile on this machine.
  assert.deepStrictEqual(M.parsePowerProfiles("power-saver\t1\nbalanced\t0").profiles.map(p => p.key), ["balanced", "power-saver"])
  assert.strictEqual(M.parsePowerProfiles("power-saver\t1\nbalanced\t0").active, "power-saver")
  const odd = M.parsePowerProfiles("quiet-mode\t1\nbalanced\t0")
  assert.deepStrictEqual(odd.profiles.map(p => p.key + ":" + p.label), ["balanced:Balanced", "quiet-mode:Quiet mode"])
  assert.deepStrictEqual(M.parsePowerProfiles(""), { profiles: [], active: "" })
  assert.deepStrictEqual(M.parsePowerProfiles(null), { profiles: [], active: "" })
})

test("stats.py reads a fake battery and handles a machine without one", () => {
  const fs = require("fs"), os = require("os"), { spawnSync } = require("child_process")
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "spaces-dock-psu-"))
  const put = (dir, files) => { fs.mkdirSync(path.join(root, dir)); for (const [k, v] of Object.entries(files)) fs.writeFileSync(path.join(root, dir, k), v + "\n") }
  put("AC", { type: "Mains", online: "0" })
  put("BAT0", { type: "Battery", status: "Discharging", capacity: "50", energy_now: "30000000", energy_full: "60000000", energy_full_design: "75000000", power_now: "10000000" })
  const code = "import runpy,json,sys; m=runpy.run_path(sys.argv[1]); print(json.dumps([m['battery'](sys.argv[2]), m['battery'](sys.argv[3])]))"
  const run = spawnSync("python3", ["-I", "-B", "-c", code, path.join(__dirname, "..", "stats.py"), root, path.join(root, "nothing")], { encoding: "utf8", timeout: 15000 })
  assert.strictEqual(run.status, 0, run.stderr)
  const [b, none] = JSON.parse(run.stdout.trim())
  assert.deepStrictEqual(b, { present: true, percent: 50, status: "Discharging", plugged: false, watts: 10, minutesLeft: 180, health: 80 })
  assert.deepStrictEqual(none, { present: false })
  fs.rmSync(root, { recursive: true, force: true })
})

if (failed) { console.log(failed + " failed"); process.exit(1) }
