import QtQuick
import Quickshell
import Quickshell.Io
import "Model.js" as Model

// Brightness of one monitor, for its dock's controls island. A built-in panel
// is read from its backlight in sysfs every two seconds. An external monitor
// is read over DDC/CI, which is slow and shares the monitor's I2C bus, so only
// on start, every minute and after a change. Changes go through
// omarchy-brightness-display, which also shows Omarchy's OSD.
Item {
  id: root

  property string screenName: ""
  property bool active: true

  readonly property bool internal: Model.isInternalDisplay(screenName)
  // 0-100, or -1 while unknown or not adjustable (no DDC/CI).
  property real percent: -1
  readonly property bool available: percent >= 0

  property string backlight: ""
  property real maxRaw: 0
  // Steps of 5% waiting for the running change, like Audio.qml.
  property int pendingSteps: 0

  function step(steps) {
    if (!steps || !root.available) return
    root.pendingSteps += steps
    if (!setProc.running) root.flush()
  }

  function flush() {
    if (root.pendingSteps === 0) return
    var amount = root.pendingSteps * 5
    root.pendingSteps = 0
    // Show the change at once; the next reading corrects it.
    root.percent = Math.max(1, Math.min(100, root.percent + amount))
    setProc.command = ["omarchy-brightness-display", "--monitor", root.screenName,
      amount > 0 ? "+" + amount + "%" : (-amount) + "%-"]
    setProc.running = true
  }

  function read() {
    if (!root.active || root.screenName === "" || setProc.running) return
    if (root.internal) {
      if (root.backlight === "") {
        if (!deviceProc.running) deviceProc.running = true
      } else {
        maxFile.reload()
        rawFile.reload()
      }
    } else if (!ddcProc.running) {
      ddcProc.command = ["omarchy-brightness-display-ddc", root.screenName]
      ddcProc.running = true
    }
  }

  onActiveChanged: read()
  onScreenNameChanged: {
    root.percent = -1
    root.backlight = ""
    read()
  }
  Component.onCompleted: read()

  Process {
    id: deviceProc
    command: ["omarchy-hw-display"]
    stdout: StdioCollector {
      waitForEnd: true
      onStreamFinished: {
        root.backlight = String(text).trim()
        if (root.backlight !== "") root.read()
      }
    }
  }

  FileView {
    id: maxFile
    path: root.backlight !== "" ? "/sys/class/backlight/" + root.backlight + "/max_brightness" : ""
    watchChanges: false
    printErrors: false
    onLoaded: root.maxRaw = Number(String(text()).trim()) || 0
  }

  FileView {
    id: rawFile
    path: root.backlight !== "" ? "/sys/class/backlight/" + root.backlight + "/brightness" : ""
    watchChanges: false
    printErrors: false
    onLoaded: {
      var raw = Number(String(text()).trim())
      if (root.maxRaw > 0 && isFinite(raw)) root.percent = Math.round(raw * 100 / root.maxRaw)
    }
  }

  Process {
    id: ddcProc
    stdout: StdioCollector {
      waitForEnd: true
      onStreamFinished: {
        var value = Number(String(text).trim())
        root.percent = String(text).trim() !== "" && isFinite(value) ? value : -1
      }
    }
  }

  Process {
    id: setProc
    onExited: {
      if (root.pendingSteps !== 0) root.flush()
      else root.read()
    }
  }

  Timer {
    interval: root.internal ? 2000 : 60000
    running: root.active && root.screenName !== ""
    repeat: true
    onTriggered: root.read()
  }
}
