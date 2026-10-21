import QtQuick
import Quickshell.Io
import "Model.js" as Model

// AI subscription limits for the limits island. Runs llm_limits.py on start
// and every five minutes; keeps the last good numbers per provider when a
// refresh comes back empty (Model.mergeLimitRecord).
Item {
  id: limits

  // Comma-separated provider ids for llm_limits.py; "" stops refreshing.
  property string providers: ""
  property int intervalMs: 5 * 60 * 1000
  property var records: ({})
  property double updatedMs: 0
  readonly property bool loading: collector.running

  readonly property string script: Qt.resolvedUrl("llm_limits.py").toString().replace(/^file:\/\//, "")

  function refresh() {
    if (limits.providers === "" || collector.running) return
    collector.command = ["/usr/bin/python3", "-B", limits.script, "--providers", limits.providers]
    collector.running = true
  }

  function store(text) {
    var parsed
    try {
      parsed = JSON.parse(String(text || "").trim())
    } catch (e) {
      console.warn("Spaces Dock limits:", e)
      return
    }
    var incoming = parsed && parsed.providers ? parsed.providers : {}
    var next = ({})
    for (var id in limits.records) next[id] = limits.records[id]
    for (var key in incoming) next[key] = Model.mergeLimitRecord(limits.records[key] || null, incoming[key])
    limits.records = next
    limits.updatedMs = Date.now()
  }

  Process {
    id: collector
    stdout: StdioCollector {
      onStreamFinished: limits.store(text)
    }
    stderr: StdioCollector {
      onStreamFinished: if (text.trim()) console.warn("Spaces Dock limits:", text.trim())
    }
  }

  Timer {
    interval: limits.intervalMs
    repeat: true
    running: limits.providers !== ""
    onTriggered: limits.refresh()
  }

  // Codex starts an app-server per probe; never let a stuck one pile up.
  Timer {
    interval: 120000
    running: collector.running
    onTriggered: collector.running = false
  }

  onProvidersChanged: Qt.callLater(limits.refresh)
  Component.onCompleted: Qt.callLater(limits.refresh)
}
