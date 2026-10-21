import QtQuick
import Quickshell
import Quickshell.Io
import Quickshell.Hyprland
import "Model.js" as Model

// Spaces Dock service. Loaded once by omarchy-shell (keepLoaded, so plugin
// hot-reloads never recreate the dock windows). It owns:
//   - settings: read from this plugin's top-level entry in shell.json and
//     written back through the shell's updateEntryInline,
//   - the media player and system stats shown by the dock's islands,
//   - IPC: open/close/toggle/peek/system/agent/playPause/next/previous/refreshLimits,
//   - one DockWindow per screen.
Item {
  id: root

  // Injected by the shell after creation. Nothing may rely on them in
  // Component.onCompleted.
  property string omarchyPath: ""
  property var shell: null
  property var manifest: null

  readonly property string pluginId: Model.PLUGIN_ID
  readonly property string configPath: Quickshell.env("HOME") + "/.config/omarchy/shell.json"

  // ------------------------------------------------------------ settings

  property var settings: ({ id: root.pluginId })
  property string settingsJson: JSON.stringify({ id: root.pluginId })
  property bool ready: false
  readonly property var cfg: Model.resolveSettings(root.settings)

  function setEntry(entry) {
    var json = JSON.stringify(entry)
    if (json === root.settingsJson) return
    root.settingsJson = json
    root.settings = entry
  }

  function readConfig(raw) {
    var entry = Model.pluginEntry(raw, root.pluginId)
    if (entry) root.setEntry(entry)
    root.ready = true
  }

  function persist(entry) {
    if (root.shell && typeof root.shell.updateEntryInline === "function")
      root.shell.updateEntryInline(root.pluginId, entry)
    else
      console.warn(root.pluginId + ": shell API not ready, setting kept until restart")
  }

  // Applied locally first so every dock redraws on the click itself; the
  // shell.json write then comes back through the file watch as the same value.
  function applySetting(delta) {
    var entry = Model.mergedEntry(root.pluginId, root.settings, delta)
    root.setEntry(entry)
    root.persist(entry)
  }

  function resetSettings() {
    var entry = { id: root.pluginId }
    root.setEntry(entry)
    root.persist(entry)
  }

  FileView {
    id: configFile
    path: root.configPath
    watchChanges: true
    printErrors: false
    onLoaded: root.readConfig(configFile.text())
    onFileChanged: configFile.reload()
    onLoadFailed: function(error) { root.ready = true }
  }

  // Show the dock with defaults even if shell.json never answers.
  Timer {
    interval: 1500
    running: !root.ready
    onTriggered: root.ready = true
  }

  // ------------------------------------------------------------ environment

  readonly property bool barHidden: root.shell && root.shell.bar ? root.shell.bar.barHidden === true : false

  readonly property string primaryScreenName: {
    var monitors = Hyprland.monitors.values
    var list = []
    for (var i = 0; i < monitors.length; i++) list.push({ name: monitors[i].name, id: monitors[i].id })
    return Model.primaryScreenName(list)
  }

  readonly property var screenNames: {
    var screens = Quickshell.screens
    var names = []
    for (var i = 0; i < screens.length; i++) if (screens[i]) names.push(String(screens[i].name || ""))
    return names
  }

  // ------------------------------------------------------------ player and stats

  // Shared by every monitor's dock.
  property alias media: mediaModel
  property alias stats: statsModel
  property alias limits: limitsModel

  Media {
    id: mediaModel
    source: root.cfg.playerSource
  }

  Stats {
    id: statsModel
    metrics: root.ready ? Model.statsMetricsArg(root.cfg) : ""
  }

  Limits {
    id: limitsModel
    providers: root.ready ? Model.limitsProvidersArg(root.cfg) : ""
    grokRefresh: root.cfg.limitGrokRefresh
  }

  // ------------------------------------------------------------ docks

  Variants {
    id: docks
    model: Quickshell.screens

    delegate: Component {
      DockWindow {
        required property var modelData
        screen: modelData
        service: root
      }
    }
  }

  function allSpaces() {
    var out = []
    var windows = docks.instances
    for (var i = 0; i < windows.length; i++) if (windows[i] && windows[i].spaces) out.push(windows[i].spaces)
    return out
  }

  // The visible dock window on the focused monitor, else the first visible one.
  function focusedDock() {
    var windows = docks.instances
    var focused = Hyprland.focusedMonitor ? String(Hyprland.focusedMonitor.name) : ""
    var fallback = null
    for (var i = 0; i < windows.length; i++) {
      var w = windows[i]
      if (!w || !w.visible) continue
      if (w.screenName === focused) return w
      if (!fallback) fallback = w
    }
    return fallback
  }

  // The visible dock on the focused monitor, else the first visible one.
  function focusedSpaces() {
    var windows = docks.instances
    var focused = Hyprland.focusedMonitor ? String(Hyprland.focusedMonitor.name) : ""
    var fallback = null
    for (var i = 0; i < windows.length; i++) {
      var w = windows[i]
      if (!w || !w.visible || !w.spaces) continue
      if (w.screenName === focused) return w.spaces
      if (!fallback) fallback = w.spaces
    }
    return fallback
  }

  // ------------------------------------------------------------ IPC

  IpcHandler {
    target: root.pluginId

    function open(): void { var s = root.focusedSpaces(); if (s) s.open() }
    function show(): void { var s = root.focusedSpaces(); if (s) s.open() }
    function close(): void { var all = root.allSpaces(); for (var i = 0; i < all.length; i++) all[i].close() }
    function hide(): void { var all = root.allSpaces(); for (var i = 0; i < all.length; i++) all[i].close() }
    function toggle(): void { var s = root.focusedSpaces(); if (s) s.toggle() }
    function peek(workspace: string): string {
      var s = root.focusedSpaces()
      return s && s.peek(workspace) ? "ok" : "empty"
    }
    function system(): void { var d = root.focusedDock(); if (d) d.systemPanel.toggle() }
    function refreshLimits(): void { limitsModel.refresh() }
    function playPause(): string { return mediaModel.playPause() ? "ok" : "no player" }
    function next(): string { return mediaModel.next() ? "ok" : "no player" }
    function previous(): string { return mediaModel.previous() ? "ok" : "no player" }
    function agent(session: string, state: string, pids: string): void {
      // Every monitor's dock tracks agents, so relay to all of them.
      var all = root.allSpaces()
      for (var i = 0; i < all.length; i++) all[i].applyAgent(session, state, pids)
    }
  }
}
