import QtQuick
import Quickshell
import qs.Commons
import qs.Ui
import "Model.js" as Model

// Stay Awake pill: one ring, filled while Stay Awake is on, with a cup
// (screens stay on), a dark monitor (screens may go off) or an empty cup
// (off, normal idle). Click for the mode picker, right-click to turn Stay
// Awake on or off in the last chosen mode.
BorderSurface {
  id: island

  required property var service
  required property var spaces
  required property var dock
  property var picker: null
  property bool flat: false
  // The ring the picker opens above.
  property alias ringItem: ring

  readonly property var awake: service.awake
  readonly property var cfg: spaces.cfg
  readonly property var dm: spaces.dm
  readonly property color fg: spaces.fg
  readonly property bool shown: cfg.showAwake
  readonly property bool on: awake.mode !== "normal"
  readonly property int inset: Math.max(0, Math.round((height - dm.pillThickness) / 2))
  readonly property int ringSize: Math.round(dm.pillThickness * 0.94)

  visible: shown
  width: shown ? ringSize + inset * 2 + spaces.sp(4) * 2 : 0
  color: flat ? "transparent" : Color.bar.background
  borderSpec: flat ? Border.none() : Border.surfaceSpec("bar", "border", "transparent", 0)

  function tooltipText() {
    var idle = island.service.idleTimeouts
    var hint = "\nClick: choose mode · Right-click: turn " + (island.on ? "off" : "on")
    if (island.awake.mode === "screens-on")
      return "Stay Awake · Screens on\nNo screensaver, lock or sleep" + hint
    if (island.awake.mode === "screens-off")
      return "Stay Awake · Screens off\nScreens go dark after " + Model.formatSeconds(island.awake.screenOffSeconds)
        + " idle, without locking. No sleep" + hint
    var parts = []
    if (idle.screensaver > 0) parts.push("screensaver after " + Model.formatSeconds(idle.screensaver))
    if (idle.lock > 0) parts.push("lock after " + Model.formatSeconds(idle.lock))
    return "Stay Awake · Off\n" + (parts.length ? parts.join(", ").replace(/^s/, "S") : "Normal idle") + hint
  }

  Item {
    id: ring
    anchors.centerIn: parent
    width: island.ringSize
    height: width
    readonly property bool tooltipHovered: ringMouse.containsMouse
    scale: ringMouse.containsMouse ? 1.08 : 1
    Behavior on scale { enabled: island.spaces.fastDur > 0; NumberAnimation { duration: island.spaces.fastDur; easing.type: Easing.OutCubic } }

    StatRing {
      anchors.fill: parent
      fraction: island.on ? 1 : -1
      color: island.fg
      trackColor: Util.alpha(island.fg, 0.12)
      discColor: island.on ? Util.alpha(island.fg, 0.16) : "transparent"
      glyph: Model.awakeGlyph(island.awake.mode)
      glyphColor: island.fg
      fontFamily: island.spaces.fontFamily
      dim: !island.on
    }

    MouseArea {
      id: ringMouse
      anchors.fill: parent
      hoverEnabled: true
      acceptedButtons: Qt.LeftButton | Qt.RightButton
      cursorShape: Qt.PointingHandCursor

      function leftClick() {
        island.dock.hideTooltip(ring)
        if (island.picker) island.picker.toggle()
      }

      onClicked: function(mouse) {
        if (mouse.button !== Qt.RightButton) {
          leftClick()
          return
        }
        island.dock.hideTooltip(ring)
        island.service.toggleAwake()
      }

      onContainsMouseChanged: {
        if (containsMouse) island.dock.showTooltip(ring, island.tooltipText())
        else island.dock.hideTooltip(ring)
      }
    }
  }
}
