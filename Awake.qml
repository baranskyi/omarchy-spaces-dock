import QtQuick
import Quickshell
import Quickshell.Io
import Quickshell.Wayland
import "Model.js" as Model

// Stay Awake for the dock's pill, shared by every monitor's dock.
// On or off is Omarchy's own stay-awake flag (omarchy-toggle-idle): its idle
// service and top-bar indicator follow it, and while it is set nothing starts
// the screensaver or locks. While it is on, the dock also holds a systemd
// inhibitor against idle and sleep. In "screens-off" mode the dock turns the
// screens off itself after the idle timeout, without locking, and wakes them
// on input. Closing the lid still suspends: logind ignores inhibitors for the
// lid switch unless told otherwise.
Item {
  id: root

  // cfg.stayAwakeMode: what Stay Awake does when it is on.
  property string setting: "screens-on"
  property int screenOffSeconds: 300

  property bool stayAwake: false
  readonly property string mode: Model.awakeMode(stayAwake, setting)
  // Whether the dock turned the screens off and owes them a wake.
  property bool blanked: false

  readonly property string stateDir: Quickshell.env("HOME") + "/.local/state/omarchy/indicators"

  function setStayAwake(on) {
    root.stayAwake = !!on
    Quickshell.execDetached(["omarchy-toggle-idle", on ? "stay-awake" : "allow-idle"])
  }

  function blank() {
    root.blanked = true
    Quickshell.execDetached(["bash", "-c", "omarchy-brightness-keyboard off; omarchy-brightness-display off"])
  }

  function wake() {
    root.blanked = false
    Quickshell.execDetached(["omarchy-system-wake"])
  }

  onModeChanged: if (root.mode !== "screens-off" && root.blanked) root.wake()

  // The flag file exists while Stay Awake is on; Omarchy's indicator and
  // `omarchy toggle idle` change it too, so watch its directory.
  FileView {
    id: flagFile
    path: root.stateDir + "/stay-awake"
    watchChanges: false
    printErrors: false
    onLoaded: root.stayAwake = true
    onLoadFailed: function(error) { root.stayAwake = false }
  }

  FileView {
    id: dirWatcher
    path: root.stateDir
    watchChanges: true
    printErrors: false
    onFileChanged: flagFile.reload()
  }

  Process {
    id: stateDirProc
    command: ["mkdir", "-p", root.stateDir]
    running: true
    onExited: {
      dirWatcher.reload()
      flagFile.reload()
    }
  }

  // A watch can miss a change made before it started; read again now and then.
  Timer {
    interval: 30000
    running: true
    repeat: true
    onTriggered: flagFile.reload()
  }

  // Held while Stay Awake is on. pdeathsig ends the inhibitor, and the sleep
  // it runs, if the shell goes away without stopping it.
  Process {
    running: root.mode !== "normal"
    command: ["setpriv", "--pdeathsig", "TERM", "systemd-inhibit", "--what=idle:sleep", "--mode=block",
      "--who=Spaces Dock", "--why=Stay Awake is on",
      "setpriv", "--pdeathsig", "TERM", "sleep", "infinity"]
  }

  IdleMonitor {
    enabled: root.mode === "screens-off"
    timeout: Math.max(1, root.screenOffSeconds)
    respectInhibitors: true
    onIsIdleChanged: {
      if (isIdle && root.mode === "screens-off") root.blank()
      else if (!isIdle && root.blanked) root.wake()
    }
  }
}
