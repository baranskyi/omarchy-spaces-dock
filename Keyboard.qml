import QtQuick
import Quickshell
import Quickshell.Io
import Quickshell.Hyprland
import "Model.js" as Model

// Active keyboard layout for the controls island, shared by every monitor's
// dock. Follows Omarchy's keyboard layout widget: read `hyprctl -j devices`
// on Hyprland's activelayout and configreloaded events, and switch the
// keyboard that reading spoke for with `hyprctl switchxkblayout`.
Item {
  id: root

  property string keyboardName: ""
  // The keyboard the last activelayout event named, which is the one typed on.
  property string typedKeyboardName: ""
  property string description: ""
  property bool multipleLayouts: false
  property bool refreshPending: false

  readonly property var language: Model.languageFor(description)
  readonly property bool available: multipleLayouts && description !== ""

  function refresh() {
    if (queryProc.running) {
      root.refreshPending = true
      return
    }
    root.refreshPending = false
    queryProc.running = true
  }

  // direction: 1 for the next layout, -1 for the previous one.
  function cycle(direction) {
    if (!root.keyboardName) return
    Quickshell.execDetached(["hyprctl", "switchxkblayout", root.keyboardName, direction < 0 ? "prev" : "next"])
    refreshTimer.restart()
  }

  Component.onCompleted: refresh()

  Connections {
    target: Hyprland
    function onRawEvent(event) {
      if (!event || !event.name) return
      var name = String(event.name)
      if (name === "activelayout") {
        var named = Model.eventKeyboardName(event.data)
        if (named) root.typedKeyboardName = named
      }
      if (name.indexOf("activelayout") !== -1 || name === "configreloaded") root.refresh()
    }
  }

  Process {
    id: queryProc
    command: ["hyprctl", "-j", "devices"]
    onRunningChanged: if (!running && root.refreshPending) root.refresh()
    stdout: StdioCollector {
      waitForEnd: true
      onStreamFinished: {
        var listed
        try {
          listed = JSON.parse(text || "{}").keyboards
        } catch (e) {
          return
        }
        if (!Array.isArray(listed)) return
        var kb = Model.selectKeyboard(listed, root.typedKeyboardName)
        if (!kb || !kb.active_keymap) {
          root.keyboardName = ""
          root.description = ""
          return
        }
        root.keyboardName = String(kb.name || "")
        root.multipleLayouts = kb.layout === undefined || String(kb.layout).indexOf(",") !== -1
        root.description = String(kb.active_keymap)
      }
    }
  }

  // A switch raises activelayout, but read again in case it got lost.
  Timer {
    id: refreshTimer
    interval: 600
    onTriggered: root.refresh()
  }
}
