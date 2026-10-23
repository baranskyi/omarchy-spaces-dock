import QtQuick
import Quickshell
import qs.Commons
import qs.Ui
import "Model.js" as Model

// System stats island. Each enabled metric is either a filling ring with its
// glyph in the middle (statsStyle "rings", the default, like the AI limits)
// or a small pill with glyph and number ("values"). Rings and pills turn
// yellow under heavy load or heat and red at the extreme (Model.statLevel).
// Hover for the number and details, click for the system panel (the
// battery opens the power profile picker), right-click for btop.
BorderSurface {
  id: island

  required property var stats
  required property var spaces
  required property var dock
  property var systemPanel: null
  property var powerPanel: null
  // The battery's ring or pill, which the power profile picker opens above.
  property Item batteryItem: null
  property bool flat: false

  // Fixed, opaque level colours so "yellow = heavy, red = extreme" holds in
  // every theme: palettes reuse their "yellow"/"red" slots freely (Dayfox's
  // yellow is dark orange, Aetheria's red is lime), and some accents are red.
  readonly property color warningFill: "#f2c230"
  readonly property color warningText: "#3a2c00"
  readonly property color criticalFill: "#e5484d"
  readonly property color criticalText: "#ffffff"

  function openPanel() {
    if (island.systemPanel) island.systemPanel.toggle()
    else island.spaces.toggle()
  }

  function openPower() {
    if (island.powerPanel) island.powerPanel.toggle()
    else island.openPanel()
  }

  function openBtop() {
    if (island.systemPanel && island.systemPanel.opened) island.systemPanel.close()
    if (island.powerPanel && island.powerPanel.opened) island.powerPanel.close()
    island.spaces.run("omarchy-launch-or-focus-tui btop")
  }

  readonly property var cfg: spaces.cfg
  readonly property var dm: spaces.dm
  readonly property color fg: spaces.fg
  // Enabled stats that this machine can show (a desktop has no battery).
  readonly property var items: Model.enabledStats(cfg).filter(function(m) { return Model.statAvailable(m.key, island.stats.state) })
  readonly property bool shown: items.length > 0
  readonly property int inset: Math.max(0, Math.round((height - dm.pillThickness) / 2))
  // Tighter than the workspace pills: stats are short, fixed-width values.
  readonly property int pillPad: spaces.sp(6)
  readonly property int pillGap: Math.max(inset, Math.round(dm.gap / 2))
  readonly property bool rings: cfg.statsStyle === "rings"
  readonly property int ringSize: Math.round(dm.pillThickness * 0.94)

  visible: shown
  width: shown ? row.implicitWidth + inset * 2 + (rings ? spaces.sp(4) * 2 : 0) : 0
  color: flat ? "transparent" : Color.bar.background
  borderSpec: flat ? Border.none() : Border.surfaceSpec("bar", "border", "transparent", 0)

  // The padding around the pills: same buttons as the pills.
  MouseArea {
    anchors.fill: parent
    acceptedButtons: Qt.LeftButton | Qt.RightButton
    function leftClick() { island.openPanel() }
    onClicked: function(mouse) {
      if (mouse.button === Qt.RightButton) island.openBtop()
      else leftClick()
    }
  }

  Row {
    id: row
    anchors.centerIn: parent
    spacing: island.rings ? island.spaces.sp(6) : island.pillGap

    Repeater {
      model: island.items

      delegate: Item {
        id: statPill

        required property var modelData
        readonly property bool isBattery: modelData.key === "battery"
        readonly property bool tooltipHovered: statMouse.containsMouse

        Component.onCompleted: if (statPill.isBattery) island.batteryItem = statPill
        Component.onDestruction: if (island.batteryItem === statPill) island.batteryItem = null
        readonly property string level: Model.statLevel(modelData.key, island.stats.state)
        readonly property color textColor: level === "critical" ? island.criticalText
          : level === "warning" ? island.warningText : island.fg

        // A normal ring uses the dock's text colour, never the theme accent,
        // which can be red and read as an alarm.
        readonly property color levelColor: level === "critical" ? island.criticalFill
          : level === "warning" ? island.warningFill : island.fg

        width: island.rings ? island.ringSize : statRow.implicitWidth + island.pillPad * 2
        height: island.rings ? island.ringSize : island.dm.pillThickness

        StatRing {
          anchors.fill: parent
          visible: island.rings
          fraction: Model.statFraction(statPill.modelData.key, island.stats.state)
          color: statPill.levelColor
          trackColor: Util.alpha(island.fg, 0.12)
          discColor: statPill.level === "normal" ? "transparent" : Util.alpha(statPill.levelColor, 0.22)
          glyph: Model.statGlyph(statPill.modelData.key, island.stats.state, statPill.modelData.icon)
          glyphColor: island.fg
          fontFamily: island.spaces.fontFamily
          dim: !island.stats.ready
          scale: statMouse.containsMouse ? 1.08 : 1
          Behavior on scale { enabled: island.spaces.fastDur > 0; NumberAnimation { duration: island.spaces.fastDur; easing.type: Easing.OutCubic } }
        }

        Rectangle {
          visible: !island.rings
          anchors.fill: parent
          radius: island.spaces.pillRadius
          color: statPill.level === "critical" ? (statMouse.containsMouse ? Qt.lighter(island.criticalFill, 1.12) : island.criticalFill)
            : statPill.level === "warning" ? (statMouse.containsMouse ? Qt.lighter(island.warningFill, 1.06) : island.warningFill)
            : statMouse.containsMouse ? Util.alpha(island.fg, 0.12) : Util.alpha(island.fg, 0.06)
          Behavior on color { enabled: island.spaces.fastDur > 0; ColorAnimation { duration: island.spaces.fastDur } }
        }

        Row {
          id: statRow
          visible: !island.rings
          anchors.centerIn: parent
          spacing: island.spaces.sp(3)

          Text {
            anchors.verticalCenter: parent.verticalCenter
            text: Model.statGlyph(statPill.modelData.key, island.stats.state, statPill.modelData.icon)
            color: statPill.textColor
            opacity: island.stats.ready ? 1 : 0.5
            font.family: island.spaces.fontFamily
            font.pixelSize: Math.round(island.dm.labelPx * 0.95)
          }

          // Fixed to the widest expected value so pills do not jitter.
          Text {
            id: valueText
            anchors.verticalCenter: parent.verticalCenter
            width: Math.max(implicitWidth, widest.width)
            horizontalAlignment: Text.AlignRight
            text: Model.statText(statPill.modelData.key, island.stats.state)
            color: statPill.textColor
            opacity: island.stats.ready ? 1 : 0.5
            font.family: island.spaces.fontFamily
            font.pixelSize: Math.round(island.dm.labelPx * 0.78)
            font.bold: true

            TextMetrics {
              id: widest
              font: valueText.font
              text: statPill.modelData.template
            }
          }
        }

        MouseArea {
          id: statMouse
          anchors.fill: parent
          hoverEnabled: true
          acceptedButtons: Qt.LeftButton | Qt.RightButton
          cursorShape: Qt.PointingHandCursor
          function leftClick() {
            island.dock.hideTooltip(statPill)
            if (statPill.isBattery) island.openPower()
            else island.openPanel()
          }
          onClicked: function(mouse) {
            if (mouse.button === Qt.RightButton) {
              island.dock.hideTooltip(statPill)
              island.openBtop()
            } else leftClick()
          }
          onContainsMouseChanged: {
            if (containsMouse) {
              var detail = Model.statDetail(statPill.modelData.key, island.stats.state)
              var value = Model.statText(statPill.modelData.key, island.stats.state)
              island.dock.showTooltip(statPill, statPill.modelData.label + " · " + value + "\n" + detail
                + (statPill.isBattery ? "\nClick: power profile · Right-click: btop" : "\nClick: system panel · Right-click: btop"))
            } else {
              island.dock.hideTooltip(statPill)
            }
          }
        }
      }
    }
  }
}
