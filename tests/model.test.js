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

test("settingsFromBarEntry copies shared settings, never dock-only ones", () => {
  const raw = JSON.stringify({ bar: { layout: { left: [{ id: "omarchy.menu" }, { id: M.BAR_WIDGET_ID, activeStyle: "accent", density: "roomy", hideEmpty: true, iconSize: 16, dockHeight: 30, bogus: 1 }] } } })
  const entry = M.barWidgetEntry(raw, M.BAR_WIDGET_ID)
  assert.strictEqual(entry.activeStyle, "accent")
  assert.deepStrictEqual(M.settingsFromBarEntry(entry), { activeStyle: "accent", density: "roomy", hideEmpty: true })
  assert.strictEqual(M.barWidgetEntry("{", M.BAR_WIDGET_ID), null)
  assert.strictEqual(M.barWidgetEntry(JSON.stringify({ bar: {} }), M.BAR_WIDGET_ID), null)
  assert.deepStrictEqual(M.settingsFromBarEntry(null), {})
})

if (failed) { console.log(failed + " failed"); process.exit(1) }
