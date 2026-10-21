import QtQuick
import Quickshell.Io

// Runs stats.py for the system stats island and keeps its latest snapshot.
// `metrics` is the comma-separated list to collect; "" stops the collector.
Item {
  id: stats

  property string metrics: ""
  property var state: ({})
  property bool ready: false
  property string error: ""

  readonly property string script: Qt.resolvedUrl("stats.py").toString().replace(/^file:\/\//, "")

  Process {
    id: backend
    command: ["/usr/bin/python3", "-B", stats.script, "--metrics", stats.metrics]

    stdout: SplitParser {
      onRead: function(line) {
        try {
          stats.state = JSON.parse(line)
          stats.ready = true
          stats.error = ""
          stale.restart()
        } catch (e) {
          console.warn("Spaces Dock stats:", e)
        }
      }
    }

    stderr: StdioCollector {
      onStreamFinished: if (text.trim()) console.warn("Spaces Dock stats:", text.trim())
    }

    onExited: {
      stats.ready = false
      if (stats.metrics !== "" && !stats.restarting) retry.restart()
    }
  }

  // A new metric set needs a new collector: stop, then start on the next tick
  // so the command picks up the new arguments.
  property bool restarting: false
  onMetricsChanged: {
    stats.restarting = true
    backend.running = false
    stats.state = ({})
    stats.ready = false
    startTimer.restart()
  }

  Timer {
    id: startTimer
    interval: 50
    onTriggered: {
      stats.restarting = false
      backend.running = stats.metrics !== ""
    }
  }

  Timer {
    id: retry
    interval: 5000
    onTriggered: if (stats.metrics !== "") backend.running = true
  }

  Timer {
    id: stale
    interval: 10000
    onTriggered: {
      stats.ready = false
      stats.error = "System stats stopped updating"
    }
  }

  Component.onCompleted: if (stats.metrics !== "") backend.running = true
}
