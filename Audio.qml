import QtQuick
import Quickshell
import Quickshell.Io
import Quickshell.Services.Pipewire

// Output volume for the controls island, shared by every monitor's dock.
// Reads the sink the volume keys move: omarchy-audio-output-sink resolves the
// default output through a DSP sink (a speaker tuning, EasyEffects) to the
// physical one, like Omarchy's audio panel. Changes go through
// omarchy-audio-output-volume, so they show the same OSD as the keys.
Item {
  id: root

  readonly property var defaultSink: Pipewire.defaultAudioSink
  readonly property var nodes: Pipewire.nodes ? Pipewire.nodes.values : []
  property string volumeSinkName: ""

  readonly property var sink: {
    if (volumeSinkName === "" || !defaultSink) return defaultSink
    if (volumeSinkName === String(defaultSink.name)) return defaultSink
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i]
      if (n && n.isSink && !n.isStream && String(n.name) === volumeSinkName && n.audio) return n
    }
    return defaultSink
  }

  readonly property bool available: !!(sink && sink.audio)
  readonly property real volume: available ? sink.audio.volume : 0
  readonly property bool muted: available ? sink.audio.muted : false
  readonly property string deviceName: sink ? String(sink.description || sink.nickname || sink.name || "") : ""

  // Steps of 5% waiting for the running change to finish, so a fast scroll
  // lands as one bigger change instead of racing the previous one.
  property int pendingSteps: 0

  function step(steps) {
    if (!steps) return
    root.pendingSteps += steps
    if (!volumeProc.running) root.flush()
  }

  function flush() {
    if (root.pendingSteps === 0) return
    var amount = root.pendingSteps * 5
    root.pendingSteps = 0
    volumeProc.command = ["omarchy-audio-output-volume", (amount > 0 ? "+" : "") + amount]
    volumeProc.running = true
  }

  function toggleMute() {
    Quickshell.execDetached(["omarchy-audio-output-volume", "mute-toggle"])
  }

  // Omarchy's own audio panel, in the top bar.
  function openPanel() {
    Quickshell.execDetached(["omarchy-shell", "omarchy.audio", "toggle"])
  }

  function resolveSink() {
    if (!sinkProc.running) sinkProc.running = true
  }

  onDefaultSinkChanged: resolveSink()
  Component.onCompleted: resolveSink()

  PwObjectTracker { objects: root.sink ? [root.sink] : [] }

  Process {
    id: sinkProc
    command: ["omarchy-audio-output-sink"]
    stdout: StdioCollector {
      waitForEnd: true
      onStreamFinished: root.volumeSinkName = String(text).trim()
    }
  }

  Process {
    id: volumeProc
    onExited: root.flush()
  }

  // A tuning can be applied or removed underneath without a new default sink.
  Timer {
    interval: 30000
    running: true
    repeat: true
    onTriggered: root.resolveSink()
  }
}
