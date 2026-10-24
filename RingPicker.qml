import QtQuick
import Quickshell
import Quickshell.Io
import qs.Commons
import qs.Ui
import "Model.js" as Model

// Power profile picker for Spaces Dock: a narrow card above the battery ring
// with one ring per power profile, stacked from performance at the top to
// power saver at the bottom. The active profile's ring is filled. Choosing
// one runs omarchy-powerprofiles-set, which also remembers the choice for
// the current power source (AC or battery), like Omarchy's own power panel.
Panel {
  id: root

  moduleName: "io.github.baranskyi.spaces-dock.power"
  ipcTarget: ""
  manageIpc: false

  // The battery ring the card opens above.
  property Item anchor: null
  property int bottomMargin: 0
  property int ringSize: 40
  property bool active: true

  // Shown until the first list arrives, so the card does not grow on open.
  property var profiles: Model.parsePowerProfiles("power-saver\nbalanced\nperformance").profiles
  property string activeProfile: ""
  property bool unavailable: false
  // Keyboard or hover cursor; -1 for none.
  property int selectedIndex: -1

  // Popup content sits on the popup background, like the system panel.
  readonly property color foreground: bar ? bar.foreground : Color.popups.text
  readonly property string fontFamily: bar ? bar.fontFamily : Style.font.family

  readonly property string caption: {
    if (root.unavailable) return "No power profiles"
    var shown = root.selectedIndex >= 0 && root.selectedIndex < root.profiles.length
      ? root.profiles[root.selectedIndex]
      : root.profiles.filter(function(p) { return p.key === root.activeProfile })[0]
    return shown ? shown.label : "Power"
  }

  // Wide enough for every label, so the card keeps its size while hovering.
  readonly property real captionWidth: {
    var labels = root.unavailable ? ["No power profiles"] : root.profiles.map(function(p) { return p.label })
    var width = captionMetrics.advanceWidth("Power")
    for (var i = 0; i < labels.length; i++) width = Math.max(width, captionMetrics.advanceWidth(labels[i]))
    return Math.ceil(width)
  }

  function refresh() {
    if (!listProc.running) listProc.running = true
  }

  function setProfile(key) {
    if (!key || setProc.running) return
    root.activeProfile = key
    setProc.command = ["omarchy-powerprofiles-set", "autodetect", key]
    setProc.running = true
    closeTimer.restart()
  }

  function moveCursor(delta) {
    if (delta === 0 || root.profiles.length === 0) return
    if (root.selectedIndex < 0) {
      var current = root.profiles.map(function(p) { return p.key }).indexOf(root.activeProfile)
      root.selectedIndex = current >= 0 ? current : 0
      return
    }
    root.selectedIndex = Math.max(0, Math.min(root.profiles.length - 1, root.selectedIndex + delta))
  }

  function activateCursor() {
    if (root.selectedIndex >= 0 && root.selectedIndex < root.profiles.length)
      root.setProfile(root.profiles[root.selectedIndex].key)
  }

  visible: true
  implicitWidth: 0
  implicitHeight: 0

  onOpenedChanged: {
    if (opened) {
      closeTimer.stop()
      root.selectedIndex = -1
      root.refresh()
      Qt.callLater(function() { keyCatcher.forceActiveFocus() })
    }
  }

  onActiveChanged: if (!active && opened) close()

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
          if (root.activeProfile === "") root.unavailable = true
          return
        }
        root.unavailable = false
        root.profiles = parsed.profiles
        root.activeProfile = parsed.active
      }
    }
  }

  Process {
    id: setProc
    onExited: root.refresh()
  }

  // Leaves the new choice on screen for a moment before closing.
  Timer {
    id: closeTimer
    interval: 350
    onTriggered: root.close()
  }

  FontMetrics {
    id: captionMetrics
    font.family: root.fontFamily
    font.pixelSize: Style.font.caption
    font.bold: true
  }

  KeyboardPanel {
    id: panel
    anchorItem: root.anchor
    owner: root
    bar: root.bar
    open: root.opened
    focusTarget: keyCatcher
    // Measured from the window edge; the dock floats bottomMargin above it.
    gap: Style.gapsOut + root.bottomMargin
    padding: Style.space(10)
    // No frame: the card reads as part of the dock, like its pills.
    borderSpec: Border.none()
    contentWidth: Math.ceil(content.implicitWidth) + panel.padding * 2 + Border.left(panel.borderSpec) + Border.right(panel.borderSpec)
    contentHeight: panel.fittedContentHeight(content.implicitHeight)

    PanelKeyCatcher {
      id: keyCatcher
      anchors.fill: parent
      onCloseRequested: root.close()
      onTabRequested: function(direction) { root.switchPanel(direction) }
      onMoveRequested: function(dx, dy) { root.moveCursor(dy !== 0 ? dy : dx) }
      onActivateRequested: root.activateCursor()

      Column {
        id: content
        anchors.horizontalCenter: parent.horizontalCenter
        spacing: Style.space(8)

        Text {
          anchors.horizontalCenter: parent.horizontalCenter
          width: Math.max(root.captionWidth, root.ringSize)
          horizontalAlignment: Text.AlignHCenter
          text: root.caption
          color: root.foreground
          opacity: 0.75
          font: captionMetrics.font
        }

        Repeater {
          model: root.unavailable ? [] : root.profiles

          delegate: Item {
            id: option

            required property var modelData
            required property int index
            readonly property bool current: root.activeProfile === modelData.key
            readonly property bool hasCursor: root.selectedIndex === index

            anchors.horizontalCenter: parent.horizontalCenter
            width: root.ringSize
            height: root.ringSize

            StatRing {
              anchors.fill: parent
              fraction: option.current ? 1 : -1
              color: root.foreground
              trackColor: Util.alpha(root.foreground, option.hasCursor ? 0.3 : 0.14)
              discColor: option.current ? Util.alpha(root.foreground, 0.16)
                : option.hasCursor ? Util.alpha(root.foreground, 0.08) : "transparent"
              glyph: option.modelData.icon
              glyphColor: root.foreground
              fontFamily: root.fontFamily
              dim: !option.current && !option.hasCursor
              scale: option.hasCursor ? 1.08 : 1
              Behavior on scale { NumberAnimation { duration: 120; easing.type: Easing.OutCubic } }
            }

            MouseArea {
              anchors.fill: parent
              hoverEnabled: true
              cursorShape: Qt.PointingHandCursor
              onContainsMouseChanged: {
                if (containsMouse) root.selectedIndex = option.index
                else if (root.selectedIndex === option.index) root.selectedIndex = -1
              }
              onClicked: root.setProfile(option.modelData.key)
            }
          }
        }
      }
    }
  }
}
