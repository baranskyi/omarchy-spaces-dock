import QtQuick
import Quickshell
import qs.Commons
import qs.Ui
import "Model.js" as Model

// System stats island: one small pill per enabled metric, in the style of the
// workspace pills. A pill turns yellow under heavy load or heat and red at the
// extreme (Model.statLevel). Hover for details, click for the system panel,
// right-click for btop.
BorderSurface {
  id: island

  required property var stats
  required property var spaces
  required property var dock
  property var systemPanel: null
  property bool flat: false

  // Opaque fills so both read on light and dark themes. Yellow is fixed: in
  // many themes the palette's "yellow" (color3) is a dark orange.
  readonly property color warningFill: "#f2c230"
  readonly property color warningText: "#3a2c00"
  readonly property color criticalFill: Color.urgent
  readonly property color criticalText: "#ffffff"

  function openPanel() {
    if (island.systemPanel) island.systemPanel.toggle()
    else island.spaces.toggle()
  }

  function openBtop() {
    if (island.systemPanel && island.systemPanel.opened) island.systemPanel.close()
    island.spaces.run("omarchy-launch-or-focus-tui btop")
  }

  readonly property var cfg: spaces.cfg
  readonly property var dm: spaces.dm
  readonly property color fg: spaces.fg
  readonly property var items: Model.enabledStats(cfg)
  readonly property bool shown: items.length > 0
  readonly property int inset: Math.max(0, Math.round((height - dm.pillThickness) / 2))
  // Tighter than the workspace pills: stats are short, fixed-width values.
  readonly property int pillPad: spaces.sp(6)
  readonly property int pillGap: Math.max(inset, Math.round(dm.gap / 2))

  visible: shown
  width: shown ? row.implicitWidth + inset * 2 : 0
  color: flat ? "transparent" : Color.bar.background
  borderSpec: flat ? Border.none() : Border.surfaceSpec("bar", "border", "transparent", 0)

  // The padding around the pills: same buttons as the pills.
  MouseArea {
    anchors.fill: parent
    acceptedButtons: Qt.LeftButton | Qt.RightButton
    onClicked: function(mouse) {
      if (mouse.button === Qt.RightButton) island.openBtop()
      else island.openPanel()
    }
  }

  Row {
    id: row
    anchors.left: parent.left
    anchors.leftMargin: island.inset
    anchors.verticalCenter: parent.verticalCenter
    spacing: island.pillGap

    Repeater {
      model: island.items

      delegate: Item {
        id: statPill

        required property var modelData
        readonly property bool tooltipHovered: statMouse.containsMouse
        readonly property string level: Model.statLevel(modelData.key, island.stats.state)
        readonly property color textColor: level === "critical" ? island.criticalText
          : level === "warning" ? island.warningText : island.fg

        width: statRow.implicitWidth + island.pillPad * 2
        height: island.dm.pillThickness

        Rectangle {
          anchors.fill: parent
          radius: island.spaces.pillRadius
          color: statPill.level === "critical" ? (statMouse.containsMouse ? Qt.lighter(island.criticalFill, 1.12) : island.criticalFill)
            : statPill.level === "warning" ? (statMouse.containsMouse ? Qt.lighter(island.warningFill, 1.06) : island.warningFill)
            : statMouse.containsMouse ? Util.alpha(island.fg, 0.12) : Util.alpha(island.fg, 0.06)
          Behavior on color { enabled: island.spaces.fastDur > 0; ColorAnimation { duration: island.spaces.fastDur } }
        }

        Row {
          id: statRow
          anchors.centerIn: parent
          spacing: island.spaces.sp(3)

          Text {
            anchors.verticalCenter: parent.verticalCenter
            text: statPill.modelData.icon
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
          onClicked: function(mouse) {
            island.dock.hideTooltip(statPill)
            if (mouse.button === Qt.RightButton) island.openBtop()
            else island.openPanel()
          }
          onContainsMouseChanged: {
            if (containsMouse) {
              var detail = Model.statDetail(statPill.modelData.key, island.stats.state)
              island.dock.showTooltip(statPill, statPill.modelData.label + "\n" + detail + "\nClick: system panel · Right-click: btop")
            } else {
              island.dock.hideTooltip(statPill)
            }
          }
        }
      }
    }
  }
}
