import QtQuick
import Quickshell
import Quickshell.Io
import "Model.js" as Model

// Power profiles for the battery's picker, shared by every monitor's dock.
// Read with omarchy-powerprofiles-list when a picker opens; set with
// omarchy-powerprofiles-set, which also remembers the choice for the current
// power source (AC or battery), like Omarchy's own power panel.
Item {
  id: root

  // Shown until the first list arrives, so a picker does not grow on open.
  property var profiles: Model.parsePowerProfiles("power-saver\nbalanced\nperformance").profiles
  property string active: ""
  property bool unavailable: false

  function refresh() {
    if (!listProc.running) listProc.running = true
  }

  function set(key) {
    if (!key || setProc.running) return
    root.active = key
    setProc.command = ["omarchy-powerprofiles-set", "autodetect", key]
    setProc.running = true
  }

  Process {
    id: listProc
    command: ["omarchy-powerprofiles-list", "--active-state"]
    stdout: StdioCollector {
      waitForEnd: true
      onStreamFinished: {
        var parsed = Model.parsePowerProfiles(text)
        // Around plug and unplug events the list can come back empty for a
        // moment; keep the last one unless there never was one.
        if (parsed.profiles.length === 0) {
          if (root.active === "") root.unavailable = true
          return
        }
        root.unavailable = false
        root.profiles = parsed.profiles
        root.active = parsed.active
      }
    }
  }

  Process {
    id: setProc
    onExited: root.refresh()
  }
}
