import QtQuick
import Quickshell
import qs.Commons
import qs.Ui
import "Model.js" as Model

// QuickFile button pill. Opens the QuickFile plugin (the same command as its
// SUPER+B binding), turns it on when it is installed but off, or offers to
// install it from the Omarchy plugin marketplace when it is missing. The dock
// never loads QuickFile's code; it only runs its public commands.
BorderSurface {
  id: island

  required property var service
  required property var spaces
  required property var dock
  property bool flat: false

  readonly property var cfg: spaces.cfg
  readonly property var dm: spaces.dm
  readonly property color fg: spaces.fg
  readonly property string qfState: service.quickfileState
  readonly property bool shown: cfg.showQuickfile
  readonly property int inset: Math.max(0, Math.round((height - dm.pillThickness) / 2))

  visible: shown
  width: shown ? dm.pillThickness + inset * 2 : 0
  color: flat ? "transparent" : Color.bar.background
  borderSpec: flat ? Border.none() : Border.surfaceSpec("bar", "border", "transparent", 0)

  Item {
    id: button
    anchors.centerIn: parent
    width: island.dm.pillThickness
    height: width
    readonly property bool tooltipHovered: buttonMouse.containsMouse

    Rectangle {
      anchors.fill: parent
      radius: island.spaces.pillRadius
      color: buttonMouse.containsMouse ? Util.alpha(island.fg, 0.12) : Util.alpha(island.fg, 0.06)
      Behavior on color { enabled: island.spaces.fastDur > 0; ColorAnimation { duration: island.spaces.fastDur } }
    }

    // nf-md-file_tree
    Text {
      anchors.centerIn: parent
      text: "\u{f0645}"
      color: island.fg
      opacity: island.qfState === "enabled" || island.qfState === "unknown" ? 1 : 0.55
      font.family: island.spaces.fontFamily
      font.pixelSize: Math.round(island.dm.labelPx * 1.05)
    }

    // A small "+" while QuickFile is not installed.
    Rectangle {
      visible: island.qfState === "missing"
      anchors.right: parent.right
      anchors.top: parent.top
      anchors.margins: island.spaces.sp(3)
      width: Math.max(10, Math.round(parent.width * 0.32))
      height: width
      radius: width / 2
      color: Color.accent
      Text {
        anchors.centerIn: parent
        text: "+"
        color: Color.background
        font.family: island.spaces.fontFamily
        font.pixelSize: Math.round(parent.width * 0.85)
        font.bold: true
      }
    }

    MouseArea {
      id: buttonMouse
      anchors.fill: parent
      hoverEnabled: true
      acceptedButtons: Qt.LeftButton | Qt.RightButton
      cursorShape: Qt.PointingHandCursor
      function leftClick() {
        island.dock.hideTooltip(button)
        island.service.activateQuickfile()
      }
      onClicked: function(mouse) {
        if (mouse.button === Qt.RightButton) {
          island.dock.hideTooltip(button)
          island.spaces.toggle()
        } else leftClick()
      }
      onContainsMouseChanged: containsMouse ? island.dock.showTooltip(button, Model.quickfileTooltip(island.qfState)) : island.dock.hideTooltip(button)
    }
  }
}
