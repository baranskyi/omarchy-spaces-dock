import QtQuick
import Quickshell
import qs.Commons
import qs.Ui
import "Model.js" as Model

// AI limits island, between the dock and the system stats: one pair of rings
// per provider (outer = 5-hour session, inner = weekly). Hover a pair for
// percentages and reset times, click to refresh, right-click for settings.
BorderSurface {
  id: island

  required property var limits
  required property var spaces
  required property var dock
  property bool flat: false

  readonly property var cfg: spaces.cfg
  readonly property var dm: spaces.dm
  readonly property color fg: spaces.fg
  // Providers that are on and have reported at least one window.
  readonly property var providers: {
    var on = Model.enabledLimitProviders(cfg)
    var out = []
    for (var i = 0; i < on.length; i++) {
      var record = island.limits.records[on[i].id]
      if (record && record.limits && record.limits.length > 0) out.push(on[i])
    }
    return out
  }
  readonly property bool shown: providers.length > 0
  readonly property int inset: Math.max(0, Math.round((height - dm.pillThickness) / 2))
  readonly property int ringSize: Math.round(dm.pillThickness * 0.86)

  visible: shown
  width: shown ? row.implicitWidth + inset * 2 + spaces.sp(4) * 2 : 0
  color: flat ? "transparent" : Color.bar.background
  borderSpec: flat ? Border.none() : Border.surfaceSpec("bar", "border", "transparent", 0)

  MouseArea {
    anchors.fill: parent
    acceptedButtons: Qt.LeftButton | Qt.RightButton
    onClicked: function(mouse) {
      if (mouse.button === Qt.RightButton) island.spaces.toggle()
      else island.limits.refresh()
    }
  }

  Row {
    id: row
    anchors.centerIn: parent
    spacing: island.spaces.sp(6)

    Repeater {
      model: island.providers

      delegate: Item {
        id: pair

        required property var modelData
        readonly property var record: island.limits.records[modelData.id] || null
        readonly property var windows: Model.limitWindows(record)
        readonly property bool tooltipHovered: pairMouse.containsMouse

        width: island.ringSize
        height: island.ringSize

        LimitRings {
          anchors.fill: parent
          sessionPercent: pair.windows.session ? pair.windows.session.percent : -1
          weeklyPercent: pair.windows.weekly ? pair.windows.weekly.percent : -1
          color: pair.modelData.color
          letterColor: island.fg
          trackColor: Util.alpha(island.fg, 0.12)
          letter: pair.modelData.letter
          fontFamily: island.spaces.fontFamily
          stale: !!(pair.record && pair.record.stale)
          scale: pairMouse.containsMouse ? 1.08 : 1
          Behavior on scale { enabled: island.spaces.fastDur > 0; NumberAnimation { duration: island.spaces.fastDur; easing.type: Easing.OutCubic } }
        }

        MouseArea {
          id: pairMouse
          anchors.fill: parent
          hoverEnabled: true
          acceptedButtons: Qt.LeftButton | Qt.RightButton
          cursorShape: Qt.PointingHandCursor
          onClicked: function(mouse) {
            island.dock.hideTooltip(pair)
            if (mouse.button === Qt.RightButton) island.spaces.toggle()
            else island.limits.refresh()
          }
          onContainsMouseChanged: {
            if (containsMouse) {
              var tip = Model.limitTooltip(pair.modelData, pair.record, Date.now())
              island.dock.showTooltip(pair, tip + "\nOuter ring: session · inner: weekly\nClick to refresh")
            } else {
              island.dock.hideTooltip(pair)
            }
          }
        }
      }
    }
  }
}
